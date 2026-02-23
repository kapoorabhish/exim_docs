import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

@Injectable()
export class SupplierPoService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
  ) {}

  async list(tenantId: string, query: {
    status?: string;
    supplierPartyId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, supplierPartyId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (supplierPartyId) where.supplierPartyId = supplierPartyId;

    const [data, total] = await Promise.all([
      this.prisma.supplierPurchaseOrder.findMany({
        where,
        include: { supplier: { select: { id: true, name: true, country: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: +pageSize,
      }),
      this.prisma.supplierPurchaseOrder.count({ where }),
    ]);
    return { data, total, page: +page, pageSize: +pageSize };
  }

  async getById(tenantId: string, id: string) {
    const po = await this.prisma.supplierPurchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        lineItems: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!po) throw new NotFoundException('Supplier purchase order not found');
    return po;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const poNumber = await this.docNumber.getNextNumber(tenantId, 'SPO');
    const { lineItems = [], ...rest } = dto;
    const totalAmount = this.calcTotal(lineItems);

    return this.prisma.supplierPurchaseOrder.create({
      data: {
        ...rest,
        tenantId,
        poNumber,
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
      include: { lineItems: true, supplier: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const po = await this.prisma.supplierPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Supplier purchase order not found');
    if (po.status !== 'DRAFT') throw new BadRequestException('Only DRAFT orders can be edited');

    const { lineItems, ...rest } = dto;
    await this.prisma.supplierPoLineItem.deleteMany({ where: { poId: id } });

    return this.prisma.supplierPurchaseOrder.update({
      where: { id },
      data: {
        ...rest,
        totalAmount: lineItems ? this.calcTotal(lineItems) : undefined,
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

  async submit(tenantId: string, id: string) {
    const po = await this.prisma.supplierPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Supplier purchase order not found');
    if (po.status !== 'DRAFT') throw new BadRequestException('Only DRAFT orders can be submitted for approval');
    return this.prisma.supplierPurchaseOrder.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
  }

  async approve(tenantId: string, id: string, userId: string) {
    const po = await this.prisma.supplierPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Supplier purchase order not found');
    if (po.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only PENDING_APPROVAL orders can be approved');
    return this.prisma.supplierPurchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async reject(tenantId: string, id: string) {
    const po = await this.prisma.supplierPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Supplier purchase order not found');
    if (po.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only PENDING_APPROVAL orders can be rejected');
    return this.prisma.supplierPurchaseOrder.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async clone(tenantId: string, userId: string, id: string) {
    const po = await this.prisma.supplierPurchaseOrder.findFirst({
      where: { id, tenantId },
      include: { lineItems: true },
    });
    if (!po) throw new NotFoundException('Supplier purchase order not found');

    const newNumber = await this.docNumber.getNextNumber(tenantId, 'SPO');
    const { id: _id, poNumber: _pn, status: _st, approvedBy: _ab, approvedAt: _aa, createdAt: _ca, updatedAt: _ua, lineItems, ...rest } = po as any;

    return this.prisma.supplierPurchaseOrder.create({
      data: {
        ...rest,
        poNumber: newNumber,
        status: 'DRAFT',
        expectedDeliveryDate: new Date(),
        createdBy: userId,
        lineItems: {
          create: lineItems.map(({ id: _lid, poId: _pid, ...li }: any) => li),
        },
      },
      include: { lineItems: true },
    });
  }

  async delete(tenantId: string, id: string) {
    const po = await this.prisma.supplierPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Supplier purchase order not found');
    if (po.status !== 'DRAFT') throw new BadRequestException('Only DRAFT orders can be deleted');
    await this.prisma.supplierPurchaseOrder.delete({ where: { id } });
    return { success: true };
  }

  async updateFulfillmentStatus(poId: string): Promise<void> {
    const po = await this.prisma.supplierPurchaseOrder.findUnique({
      where: { id: poId },
      include: {
        lineItems: true,
        supplierInvoices: { include: { lineItems: true } },
      },
    });
    if (!po) return;

    const poTotal = po.lineItems.reduce((sum, li) => sum + Number(li.quantity), 0);
    const invoicedTotal = po.supplierInvoices.reduce(
      (sum, inv) => sum + inv.lineItems.reduce((s, li) => s + Number(li.quantity), 0),
      0,
    );

    let status: string;
    if (invoicedTotal <= 0) {
      status = 'APPROVED';
    } else if (invoicedTotal < poTotal) {
      status = 'PARTIALLY_FULFILLED';
    } else {
      status = 'FULLY_FULFILLED';
    }

    await this.prisma.supplierPurchaseOrder.update({ where: { id: poId }, data: { status: status as any } });
  }

  private calcTotal(lineItems: any[]): number {
    return lineItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  }
}