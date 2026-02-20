import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class BrcService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string, query: any) {
    const { invoiceId, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    return this.prisma.bankRealizationCertificate.findMany({
      where: {
        tenantId,
        ...(invoiceId && { invoiceId }),
        ...(status && { status }),
      },
      include: {
        invoice: { select: { invoiceNumber: true, currency: true } },
        shippingBill: { select: { sbNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });
  }

  async getById(tenantId: string, id: string) {
    const brc = await this.prisma.bankRealizationCertificate.findFirst({
      where: { id, tenantId },
      include: {
        invoice: { select: { invoiceNumber: true } },
        shippingBill: { select: { sbNumber: true } },
      },
    });
    if (!brc) throw new NotFoundException('BRC not found');
    return brc;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, shippingBillId, ...rest } = dto;

    const invoice = await this.prisma.commercialInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (shippingBillId) {
      const sb = await this.prisma.shippingBill.findFirst({ where: { id: shippingBillId, tenantId } });
      if (!sb) throw new NotFoundException('Shipping Bill not found');
    }

    return this.prisma.bankRealizationCertificate.create({
      data: {
        ...rest,
        tenantId,
        invoiceId,
        shippingBillId: shippingBillId ?? null,
        realizationDate: rest.realizationDate ? new Date(rest.realizationDate) : new Date(),
        createdBy: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const brc = await this.prisma.bankRealizationCertificate.findFirst({ where: { id, tenantId } });
    if (!brc) throw new NotFoundException('BRC not found');

    return this.prisma.bankRealizationCertificate.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.realizationDate && { realizationDate: new Date(dto.realizationDate) }),
      },
    });
  }

  async markReceived(tenantId: string, id: string, brcNumber?: string) {
    const brc = await this.prisma.bankRealizationCertificate.findFirst({ where: { id, tenantId } });
    if (!brc) throw new NotFoundException('BRC not found');

    return this.prisma.bankRealizationCertificate.update({
      where: { id },
      data: { status: 'RECEIVED', ...(brcNumber && { brcNumber }) },
    });
  }

  async delete(tenantId: string, id: string) {
    const brc = await this.prisma.bankRealizationCertificate.findFirst({ where: { id, tenantId } });
    if (!brc) throw new NotFoundException('BRC not found');

    await this.prisma.bankRealizationCertificate.delete({ where: { id } });
    return { message: 'BRC deleted' };
  }
}