import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

@Injectable()
export class ProformaService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
  ) {}

  async list(tenantId: string, query: { status?: string; buyerPartyId?: string; page?: number; pageSize?: number }) {
    const { status, buyerPartyId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (buyerPartyId) where.buyerPartyId = buyerPartyId;

    const [data, total] = await Promise.all([
      this.prisma.proformaInvoice.findMany({
        where,
        include: { buyer: { select: { id: true, name: true, country: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.proformaInvoice.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getById(tenantId: string, id: string) {
    const pi = await this.prisma.proformaInvoice.findFirst({
      where: { id, tenantId },
      include: {
        buyer: true,
        lineItems: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!pi) throw new NotFoundException('Proforma invoice not found');
    return pi;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const piNumber = await this.docNumber.getNextNumber(tenantId, 'PI');
    const { lineItems = [], ...rest } = dto;

    return this.prisma.proformaInvoice.create({
      data: {
        ...rest,
        tenantId,
        piNumber,
        createdBy: userId,
        totalAmount: this.calcTotal(lineItems, rest.freight, rest.insurance),
        lineItems: {
          create: lineItems.map((item: any, i: number) => ({
            ...item,
            lineNumber: i + 1,
            amount: Number(item.quantity) * Number(item.unitPrice),
          })),
        },
      },
      include: { lineItems: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const pi = await this.prisma.proformaInvoice.findFirst({ where: { id, tenantId } });
    if (!pi) throw new NotFoundException('Proforma invoice not found');
    if (pi.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be edited');

    const { lineItems, ...rest } = dto;

    await this.prisma.piLineItem.deleteMany({ where: { piId: id } });

    return this.prisma.proformaInvoice.update({
      where: { id },
      data: {
        ...rest,
        totalAmount: lineItems ? this.calcTotal(lineItems, rest.freight ?? pi.freight, rest.insurance ?? pi.insurance) : undefined,
        lineItems: lineItems ? {
          create: lineItems.map((item: any, i: number) => ({
            ...item,
            lineNumber: i + 1,
            amount: Number(item.quantity) * Number(item.unitPrice),
          })),
        } : undefined,
      },
      include: { lineItems: true },
    });
  }

  async finalize(tenantId: string, id: string) {
    const pi = await this.prisma.proformaInvoice.findFirst({ where: { id, tenantId } });
    if (!pi) throw new NotFoundException('Proforma invoice not found');
    if (pi.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be finalized');
    return this.prisma.proformaInvoice.update({ where: { id }, data: { status: 'FINALIZED' } });
  }

  async revise(tenantId: string, id: string, userId: string) {
    const pi = await this.prisma.proformaInvoice.findFirst({
      where: { id, tenantId },
      include: { lineItems: true },
    });
    if (!pi) throw new NotFoundException('Proforma invoice not found');
    if (pi.status !== 'FINALIZED') throw new BadRequestException('Only FINALIZED invoices can be revised');

    const newPiNumber = await this.docNumber.getNextNumber(tenantId, 'PI');
    const { id: _id, createdAt: _ca, updatedAt: _ua, piNumber: _pn, status: _st, lineItems, ...piData } = pi as any;

    const [, newPi] = await this.prisma.$transaction([
      this.prisma.proformaInvoice.update({ where: { id }, data: { status: 'CANCELLED' } }),
      this.prisma.proformaInvoice.create({
        data: {
          ...piData,
          piNumber: newPiNumber,
          status: 'DRAFT',
          version: pi.version + 1,
          parentId: id,
          createdBy: userId,
          lineItems: {
            create: lineItems.map(({ id: _lid, piId: _pid, ...li }: any) => li),
          },
        },
        include: { lineItems: true },
      }),
    ]);
    return newPi;
  }

  async convert(tenantId: string, id: string, userId: string) {
    const pi = await this.prisma.proformaInvoice.findFirst({
      where: { id, tenantId },
      include: { lineItems: true },
    });
    if (!pi) throw new NotFoundException('Proforma invoice not found');
    if (pi.status !== 'FINALIZED') throw new BadRequestException('Only FINALIZED PIs can be converted');

    // Snapshot exchange rate
    const rate = await this.prisma.exchangeRate.findFirst({
      where: { currencyCode: pi.currency, rateType: 'RBI' },
      orderBy: { date: 'desc' },
    });

    const invNumber = await this.docNumber.getNextNumber(tenantId, 'INV');

    const [updatedPi, invoice] = await this.prisma.$transaction([
      this.prisma.proformaInvoice.update({ where: { id }, data: { status: 'CONVERTED' } }),
      this.prisma.commercialInvoice.create({
        data: {
          tenantId,
          invoiceNumber: invNumber,
          date: new Date(),
          piId: id,
          buyerPartyId: pi.buyerPartyId,
          currency: pi.currency,
          exchangeRate: rate ? rate.rate : 1,
          incoterm: pi.incoterm ?? undefined,
          paymentTerms: pi.paymentTerms ?? undefined,
          bankAccountId: pi.bankAccountId ?? undefined,
          portOfLoading: pi.portOfLoading ?? undefined,
          portOfDischarge: pi.portOfDischarge ?? undefined,
          freight: pi.freight ?? undefined,
          insurance: pi.insurance ?? undefined,
          totalAmount: pi.totalAmount,
          termsContent: pi.termsContent ?? undefined,
          notes: pi.notes ?? undefined,
          createdBy: userId,
          lineItems: {
            create: pi.lineItems.map(({ id: _lid, piId: _pid, ...li }: any) => li),
          },
        },
        include: { lineItems: true },
      }),
    ]);
    return { pi: updatedPi, invoice };
  }

  async cancel(tenantId: string, id: string) {
    const pi = await this.prisma.proformaInvoice.findFirst({ where: { id, tenantId } });
    if (!pi) throw new NotFoundException('Proforma invoice not found');
    if (pi.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be cancelled');
    return this.prisma.proformaInvoice.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async clone(tenantId: string, userId: string, id: string) {
    const pi = await this.prisma.proformaInvoice.findFirst({
      where: { id, tenantId },
      include: { lineItems: true },
    });
    if (!pi) throw new NotFoundException('Proforma invoice not found');

    const newNumber = await this.docNumber.getNextNumber(tenantId, 'PI');
    const { id: _id, piNumber, version, status, createdAt, updatedAt, createdBy, lineItems, ...rest } = pi as any;

    return this.prisma.proformaInvoice.create({
      data: {
        ...rest,
        piNumber: newNumber,
        version: 1,
        status: 'DRAFT',
        date: new Date(),
        validUntil: null,
        createdBy: userId,
        lineItems: {
          create: lineItems.map(({ id: _lid, piId: _pid, createdAt: _lca, updatedAt: _lua, ...li }: any) => li),
        },
      },
      include: { lineItems: true },
    });
  }

  private calcTotal(lineItems: any[], freight?: any, insurance?: any): number {
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
    return subtotal + Number(freight ?? 0) + Number(insurance ?? 0);
  }
}