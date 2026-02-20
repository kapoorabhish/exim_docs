import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string, query: any) {
    const { invoiceId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    return this.prisma.insuranceCertificate.findMany({
      where: { tenantId, ...(invoiceId && { invoiceId }) },
      include: { invoice: { select: { invoiceNumber: true, currency: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });
  }

  async getById(tenantId: string, id: string) {
    const ic = await this.prisma.insuranceCertificate.findFirst({
      where: { id, tenantId },
      include: { invoice: { select: { invoiceNumber: true } } },
    });
    if (!ic) throw new NotFoundException('Insurance Certificate not found');
    return ic;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, ...rest } = dto;

    const invoice = await this.prisma.commercialInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.insuranceCertificate.create({
      data: {
        ...rest,
        tenantId,
        invoiceId,
        policyDate: rest.policyDate ? new Date(rest.policyDate) : new Date(),
        validUntil: rest.validUntil ? new Date(rest.validUntil) : null,
        createdBy: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const ic = await this.prisma.insuranceCertificate.findFirst({ where: { id, tenantId } });
    if (!ic) throw new NotFoundException('Insurance Certificate not found');

    return this.prisma.insuranceCertificate.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.policyDate && { policyDate: new Date(dto.policyDate) }),
        ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const ic = await this.prisma.insuranceCertificate.findFirst({ where: { id, tenantId } });
    if (!ic) throw new NotFoundException('Insurance Certificate not found');

    await this.prisma.insuranceCertificate.delete({ where: { id } });
    return { message: 'Insurance Certificate deleted' };
  }
}