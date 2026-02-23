import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class BuyerPoService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: any) {
    const { status, buyerPartyId, poType, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (buyerPartyId) where.buyerPartyId = buyerPartyId;
    if (poType) where.poType = poType;

    const [data, total] = await Promise.all([
      this.prisma.buyerPurchaseOrder.findMany({
        where,
        include: { buyer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.buyerPurchaseOrder.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getById(tenantId: string, id: string) {
    const po = await this.prisma.buyerPurchaseOrder.findFirst({
      where: { id, tenantId },
      include: { buyer: true, lineItems: true, pi: { select: { id: true, piNumber: true } } },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { lineItems = [], ...rest } = dto;
    const total = lineItems.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    return this.prisma.buyerPurchaseOrder.create({
      data: {
        ...rest,
        tenantId,
        createdBy: userId,
        totalAmount: total,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const po = await this.prisma.buyerPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    const { lineItems, ...rest } = dto;
    if (lineItems) await this.prisma.buyerPoLineItem.deleteMany({ where: { poId: id } });
    const total = lineItems ? lineItems.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0) : undefined;
    return this.prisma.buyerPurchaseOrder.update({
      where: { id },
      data: {
        ...rest,
        totalAmount: total,
        lineItems: lineItems ? { create: lineItems } : undefined,
      },
      include: { lineItems: true },
    });
  }

  async setStatus(tenantId: string, id: string, status: string) {
    const po = await this.prisma.buyerPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    return this.prisma.buyerPurchaseOrder.update({ where: { id }, data: { status: status as any } });
  }

  async delete(tenantId: string, id: string) {
    const po = await this.prisma.buyerPurchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    return this.prisma.buyerPurchaseOrder.delete({ where: { id } });
  }
}