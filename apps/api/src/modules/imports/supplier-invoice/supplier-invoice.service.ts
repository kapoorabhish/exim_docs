import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { SupplierPoService } from '../supplier-po/supplier-po.service';

@Injectable()
export class SupplierInvoiceService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
    private supplierPoService: SupplierPoService,
  ) {}

  async list(tenantId: string, query: {
    status?: string;
    supplierPartyId?: string;
    poId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, supplierPartyId, poId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (supplierPartyId) where.supplierPartyId = supplierPartyId;
    if (poId) where.poId = poId;

    const [data, total] = await Promise.all([
      this.prisma.supplierInvoice.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, country: true } },
          po: { select: { id: true, poNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * +pageSize,
        take: +pageSize,
      }),
      this.prisma.supplierInvoice.count({ where }),
    ]);
    return { data, total, page: +page, pageSize: +pageSize };
  }

  async getById(tenantId: string, id: string) {
    const inv = await this.prisma.supplierInvoice.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        po: true,
        lineItems: { orderBy: { lineNumber: 'asc' } },
        billsOfEntry: true,
        importBls: true,
      },
    });
    if (!inv) throw new NotFoundException('Supplier invoice not found');
    return inv;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { lineItems = [], poId, ...rest } = dto;

    if (poId) {
      const po = await this.prisma.supplierPurchaseOrder.findFirst({ where: { id: poId, tenantId } });
      if (!po) throw new NotFoundException('Supplier purchase order not found');
    }

    const invoiceNumber = await this.docNumber.getNextNumber(tenantId, 'SINV');
    const totalAmount = lineItems.reduce(
      (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const inv = await this.prisma.supplierInvoice.create({
      data: {
        ...rest,
        tenantId,
        invoiceNumber,
        poId: poId ?? null,
        createdBy: userId,
        totalAmount,
        lineItems: {
          create: lineItems.map((item: any, i: number) => ({
            ...item,
            lineNumber: i + 1,
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
          })),
        },
      },
      include: { lineItems: true, supplier: true, po: true },
    });

    if (poId) {
      await this.supplierPoService.updateFulfillmentStatus(poId);
    }

    return inv;
  }

  async update(tenantId: string, id: string, dto: any) {
    const inv = await this.prisma.supplierInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Supplier invoice not found');
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be edited');

    const { lineItems, ...rest } = dto;
    await this.prisma.supplierInvoiceLineItem.deleteMany({ where: { invoiceId: id } });

    return this.prisma.supplierInvoice.update({
      where: { id },
      data: {
        ...rest,
        totalAmount: lineItems
          ? lineItems.reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice), 0)
          : undefined,
        lineItems: lineItems ? {
          create: lineItems.map((item: any, i: number) => ({
            ...item,
            lineNumber: i + 1,
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
          })),
        } : undefined,
      },
      include: { lineItems: true },
    });
  }

  async receive(tenantId: string, id: string) {
    const inv = await this.prisma.supplierInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Supplier invoice not found');
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be marked as received');
    return this.prisma.supplierInvoice.update({ where: { id }, data: { status: 'RECEIVED' } });
  }

  async getDocumentSet(tenantId: string, id: string) {
    const invoice = await this.prisma.supplierInvoice.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        po: { include: { lineItems: true } },
        lineItems: { orderBy: { lineNumber: 'asc' } },
        billsOfEntry: {
          include: {
            landedCosts: true,
            importDocs: true,
          },
        },
        importBls: true,
      },
    });
    if (!invoice) throw new NotFoundException('Supplier invoice not found');
    return invoice;
  }

  async delete(tenantId: string, id: string) {
    const inv = await this.prisma.supplierInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Supplier invoice not found');
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be deleted');
    await this.prisma.supplierInvoice.delete({ where: { id } });
    return { success: true };
  }
}