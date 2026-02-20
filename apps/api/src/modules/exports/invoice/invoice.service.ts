import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
  ) {}

  async list(tenantId: string, query: any) {
    const { status, buyerPartyId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (buyerPartyId) where.buyerPartyId = buyerPartyId;

    const [data, total] = await Promise.all([
      this.prisma.commercialInvoice.findMany({
        where,
        include: { buyer: { select: { id: true, name: true, country: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.commercialInvoice.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getById(tenantId: string, id: string) {
    const inv = await this.prisma.commercialInvoice.findFirst({
      where: { id, tenantId },
      include: {
        buyer: true,
        lineItems: { orderBy: { lineNumber: 'asc' } },
        pi: { select: { id: true, piNumber: true } },
      },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const invNumber = await this.docNumber.getNextNumber(tenantId, 'INV');
    const { lineItems = [], ...rest } = dto;

    // Snapshot exchange rate
    const rate = await this.prisma.exchangeRate.findFirst({
      where: { currencyCode: rest.currency ?? 'USD', rateType: 'RBI' },
      orderBy: { date: 'desc' },
    });

    const subtotal = lineItems.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const total = subtotal + Number(rest.freight ?? 0) + Number(rest.insurance ?? 0);

    return this.prisma.commercialInvoice.create({
      data: {
        ...rest,
        tenantId,
        invoiceNumber: invNumber,
        exchangeRate: rest.exchangeRate ?? (rate ? rate.rate : 1),
        totalAmount: total,
        createdBy: userId,
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
    const inv = await this.prisma.commercialInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === 'LOCKED') throw new ConflictException('Invoice is locked after Shipping Bill filing');
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be edited');

    const { lineItems, ...rest } = dto;
    await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

    const subtotal = (lineItems ?? []).reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const total = subtotal + Number(rest.freight ?? inv.freight ?? 0) + Number(rest.insurance ?? inv.insurance ?? 0);

    return this.prisma.commercialInvoice.update({
      where: { id },
      data: {
        ...rest,
        totalAmount: lineItems ? total : undefined,
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
    const inv = await this.prisma.commercialInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be finalized');
    return this.prisma.commercialInvoice.update({ where: { id }, data: { status: 'FINALIZED' } });
  }

  async lock(tenantId: string, id: string) {
    const inv = await this.prisma.commercialInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'FINALIZED') throw new BadRequestException('Only FINALIZED invoices can be locked');
    return this.prisma.commercialInvoice.update({ where: { id }, data: { status: 'LOCKED' } });
  }

  async delete(tenantId: string, id: string) {
    const inv = await this.prisma.commercialInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be deleted');
    return this.prisma.commercialInvoice.delete({ where: { id } });
  }

  async clone(tenantId: string, userId: string, id: string) {
    const inv = await this.prisma.commercialInvoice.findFirst({
      where: { id, tenantId },
      include: { lineItems: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    const newNumber = await this.docNumber.getNextNumber(tenantId, 'INV');
    const { id: _id, invoiceNumber, status, createdAt, updatedAt, createdBy, lineItems, ...rest } = inv as any;

    return this.prisma.commercialInvoice.create({
      data: {
        ...rest,
        invoiceNumber: newNumber,
        status: 'DRAFT',
        createdBy: userId,
        date: new Date(),
        lineItems: {
          create: lineItems.map((li: any) => {
            const { id: _lid, invoiceId, createdAt: _lca, updatedAt: _lua, ...liRest } = li;
            return liRest;
          }),
        },
      },
      include: { lineItems: true },
    });
  }

  async documentSet(tenantId: string, id: string) {
    const inv = await this.prisma.commercialInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');

    const [pi, packingLists, shippingBills, bankRealizationCertificates] = await Promise.all([
      inv.piId
        ? this.prisma.proformaInvoice.findFirst({
            where: { id: inv.piId, tenantId },
            select: { id: true, piNumber: true, version: true, status: true, date: true },
          })
        : null,
      this.prisma.packingList.findMany({
        where: { invoiceId: id, tenantId },
        select: { id: true, plNumber: true, status: true, date: true, totalPackages: true, totalGrossWeight: true, totalCbm: true },
      }),
      this.prisma.shippingBill.findMany({
        where: { invoiceId: id, tenantId },
        select: { id: true, sbNumber: true, status: true, portCode: true, totalFobInr: true, date: true },
      }),
      this.prisma.bankRealizationCertificate.findMany({
        where: { invoiceId: id, tenantId },
        select: { id: true, brcNumber: true, status: true, foreignCurrency: true, foreignAmount: true, inrAmount: true, realizationDate: true },
      }),
    ]);

    return { proformaInvoice: pi, packingLists, shippingBills, bankRealizationCertificates };
  }

  async register(tenantId: string, query: any) {
    const { page = 1, limit = 50, status, from, to } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.commercialInvoice.findMany({
        where,
        include: {
          buyer: { select: { name: true, country: true } },
          shippingBills: {
            select: { id: true, sbNumber: true, status: true, totalFobInr: true },
            orderBy: { createdAt: 'asc' },
          },
          bankRealizationCertificates: {
            select: { id: true, status: true, foreignAmount: true, inrAmount: true, foreignCurrency: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.commercialInvoice.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }
}
