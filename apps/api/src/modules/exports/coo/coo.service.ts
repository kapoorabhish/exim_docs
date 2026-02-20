import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

const COO_TRANSITIONS: Record<string, string> = {
  DRAFT: 'SUBMITTED',
  SUBMITTED: 'ISSUED',
};

@Injectable()
export class CooService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
  ) {}

  list(tenantId: string, query: any) {
    const { status, invoiceId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    return this.prisma.certificateOfOrigin.findMany({
      where: {
        tenantId,
        ...(status && { status }),
        ...(invoiceId && { invoiceId }),
      },
      include: {
        invoice: { select: { invoiceNumber: true, currency: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });
  }

  async getById(tenantId: string, id: string) {
    const coo = await this.prisma.certificateOfOrigin.findFirst({
      where: { id, tenantId },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            currency: true,
            totalAmount: true,
            countryOfOrigin: true,
            buyer: { select: { name: true, country: true, address: true } },
          },
        },
      },
    });
    if (!coo) throw new NotFoundException('Certificate of Origin not found');
    return coo;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, ...rest } = dto;

    const invoice = await this.prisma.commercialInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const cooNumber = await this.docNumber.getNextNumber(tenantId, 'COO');

    return this.prisma.certificateOfOrigin.create({
      data: {
        tenantId,
        cooNumber,
        invoiceId,
        issueDate: rest.issueDate ? new Date(rest.issueDate) : new Date(),
        cooType: rest.cooType ?? 'NON_PREFERENTIAL',
        issuingAuthority: rest.issuingAuthority ?? '',
        status: 'DRAFT',
        documentUrl: rest.documentUrl ?? null,
        notes: rest.notes ?? null,
        createdBy: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const coo = await this.prisma.certificateOfOrigin.findFirst({ where: { id, tenantId } });
    if (!coo) throw new NotFoundException('Certificate of Origin not found');
    if (coo.status !== 'DRAFT') throw new BadRequestException('Only DRAFT certificates can be updated');

    return this.prisma.certificateOfOrigin.update({
      where: { id },
      data: {
        ...(dto.issueDate && { issueDate: new Date(dto.issueDate) }),
        ...(dto.cooType && { cooType: dto.cooType }),
        ...(dto.issuingAuthority !== undefined && { issuingAuthority: dto.issuingAuthority }),
        ...(dto.documentUrl !== undefined && { documentUrl: dto.documentUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async transitionStatus(tenantId: string, id: string, body: any) {
    const coo = await this.prisma.certificateOfOrigin.findFirst({ where: { id, tenantId } });
    if (!coo) throw new NotFoundException('Certificate of Origin not found');

    const { status: nextStatus, documentUrl } = body;
    const allowedNext = COO_TRANSITIONS[coo.status];

    if (!allowedNext) throw new BadRequestException(`No transitions allowed from ${coo.status}`);
    if (nextStatus !== allowedNext) {
      throw new BadRequestException(
        `Invalid transition. Current: ${coo.status}, allowed next: ${allowedNext}`,
      );
    }

    return this.prisma.certificateOfOrigin.update({
      where: { id },
      data: {
        status: nextStatus,
        // Attach document URL when marking as ISSUED
        ...(nextStatus === 'ISSUED' && documentUrl && { documentUrl }),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const coo = await this.prisma.certificateOfOrigin.findFirst({ where: { id, tenantId } });
    if (!coo) throw new NotFoundException('Certificate of Origin not found');
    if (coo.status !== 'DRAFT') throw new BadRequestException('Only DRAFT certificates can be deleted');

    await this.prisma.certificateOfOrigin.delete({ where: { id } });
    return { message: 'Certificate of Origin deleted' };
  }
}