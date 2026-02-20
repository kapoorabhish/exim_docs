import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class BillOfLadingService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string, query: any) {
    const { invoiceId, shippingBillId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    return this.prisma.billOfLading.findMany({
      where: {
        tenantId,
        ...(invoiceId && { invoiceId }),
        ...(shippingBillId && { shippingBillId }),
      },
      include: {
        invoice: { select: { invoiceNumber: true, currency: true } },
        shippingBill: { select: { sbNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });
  }

  async getById(tenantId: string, id: string) {
    const bl = await this.prisma.billOfLading.findFirst({
      where: { id, tenantId },
      include: {
        invoice: { select: { invoiceNumber: true, currency: true, totalAmount: true } },
        shippingBill: { select: { sbNumber: true, status: true } },
      },
    });
    if (!bl) throw new NotFoundException('Bill of Lading not found');
    return bl;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, shippingBillId, ...rest } = dto;

    const invoice = await this.prisma.commercialInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (shippingBillId) {
      const sb = await this.prisma.shippingBill.findFirst({ where: { id: shippingBillId, tenantId } });
      if (!sb) throw new NotFoundException('Shipping Bill not found');
    }

    return this.prisma.billOfLading.create({
      data: {
        ...rest,
        tenantId,
        invoiceId,
        shippingBillId: shippingBillId ?? null,
        blDate: rest.blDate ? new Date(rest.blDate) : new Date(),
        createdBy: userId,
      },
      include: {
        invoice: { select: { invoiceNumber: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const bl = await this.prisma.billOfLading.findFirst({ where: { id, tenantId } });
    if (!bl) throw new NotFoundException('Bill of Lading not found');

    return this.prisma.billOfLading.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.blDate && { blDate: new Date(dto.blDate) }),
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const bl = await this.prisma.billOfLading.findFirst({ where: { id, tenantId } });
    if (!bl) throw new NotFoundException('Bill of Lading not found');

    const allowed = ['ISSUED', 'SURRENDERED', 'TELEX_RELEASED'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid B/L status');

    return this.prisma.billOfLading.update({ where: { id }, data: { status: status as any } });
  }

  async delete(tenantId: string, id: string) {
    const bl = await this.prisma.billOfLading.findFirst({ where: { id, tenantId } });
    if (!bl) throw new NotFoundException('Bill of Lading not found');

    await this.prisma.billOfLading.delete({ where: { id } });
    return { message: 'Bill of Lading deleted' };
  }
}