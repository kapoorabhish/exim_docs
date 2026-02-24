import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

const TRANSITIONS: Record<string, string> = {
  DRAFT: 'ACTIVE',
  ACTIVE: 'SUBMITTED',
  SUBMITTED: 'UNDER_REVIEW',
  UNDER_REVIEW: 'ACCEPTED',
  ACCEPTED: 'PAYMENT_RELEASED',
  PAYMENT_RELEASED: 'CLOSED',
};

@Injectable()
export class LcService {
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
      this.prisma.letterOfCredit.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, country: true } },
          _count: { select: { requiredDocs: true, discrepancies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.letterOfCredit.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getById(tenantId: string, id: string) {
    const lc = await this.prisma.letterOfCredit.findFirst({
      where: { id, tenantId },
      include: {
        buyer: { select: { id: true, name: true, country: true } },
        requiredDocs: { orderBy: { id: 'asc' } },
        discrepancies: { orderBy: { raisedAt: 'desc' } },
      },
    });
    if (!lc) throw new NotFoundException('Letter of Credit not found');
    return lc;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const lcNumber = await this.docNumber.getNextNumber(tenantId, 'LC');
    const { requiredDocs, ...rest } = dto;

    return this.prisma.letterOfCredit.create({
      data: {
        tenantId,
        lcNumber: rest.lcNumber ?? lcNumber,
        lcDate: new Date(rest.lcDate),
        lcType: rest.lcType ?? 'SIGHT',
        isIrrevocable: rest.isIrrevocable ?? true,
        isConfirmed: rest.isConfirmed ?? false,
        issuingBank: rest.issuingBank,
        advisingBank: rest.advisingBank ?? null,
        buyerPartyId: rest.buyerPartyId,
        currency: rest.currency,
        amount: rest.amount,
        expiryDate: new Date(rest.expiryDate),
        latestShipmentDate: rest.latestShipmentDate ? new Date(rest.latestShipmentDate) : null,
        portOfLoading: rest.portOfLoading ?? null,
        portOfDischarge: rest.portOfDischarge ?? null,
        partialShipmentAllowed: rest.partialShipmentAllowed ?? false,
        transhipmentAllowed: rest.transhipmentAllowed ?? false,
        proformaInvoiceId: rest.proformaInvoiceId ?? null,
        notes: rest.notes ?? null,
        createdBy: userId,
        ...(requiredDocs?.length && {
          requiredDocs: {
            create: requiredDocs.map((d: any) => ({
              documentType: d.documentType,
              originalsRequired: d.originalsRequired ?? 1,
              copiesRequired: d.copiesRequired ?? 0,
              specialInstructions: d.specialInstructions ?? null,
            })),
          },
        }),
      },
      include: { requiredDocs: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const lc = await this.prisma.letterOfCredit.findFirst({ where: { id, tenantId } });
    if (!lc) throw new NotFoundException('Letter of Credit not found');
    if (lc.status !== 'DRAFT') throw new BadRequestException('Only DRAFT LCs can be updated');

    const { requiredDocs, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (requiredDocs !== undefined) {
        await tx.lcRequiredDocument.deleteMany({ where: { lcId: id } });
        if (requiredDocs.length) {
          await tx.lcRequiredDocument.createMany({
            data: requiredDocs.map((d: any) => ({
              lcId: id,
              documentType: d.documentType,
              originalsRequired: d.originalsRequired ?? 1,
              copiesRequired: d.copiesRequired ?? 0,
              specialInstructions: d.specialInstructions ?? null,
            })),
          });
        }
      }
      return tx.letterOfCredit.update({
        where: { id },
        data: {
          ...(rest.lcDate && { lcDate: new Date(rest.lcDate) }),
          ...(rest.lcType && { lcType: rest.lcType }),
          ...(rest.isIrrevocable !== undefined && { isIrrevocable: rest.isIrrevocable }),
          ...(rest.isConfirmed !== undefined && { isConfirmed: rest.isConfirmed }),
          ...(rest.issuingBank && { issuingBank: rest.issuingBank }),
          ...(rest.advisingBank !== undefined && { advisingBank: rest.advisingBank }),
          ...(rest.currency && { currency: rest.currency }),
          ...(rest.amount !== undefined && { amount: rest.amount }),
          ...(rest.expiryDate && { expiryDate: new Date(rest.expiryDate) }),
          ...(rest.latestShipmentDate !== undefined && {
            latestShipmentDate: rest.latestShipmentDate ? new Date(rest.latestShipmentDate) : null,
          }),
          ...(rest.portOfLoading !== undefined && { portOfLoading: rest.portOfLoading }),
          ...(rest.portOfDischarge !== undefined && { portOfDischarge: rest.portOfDischarge }),
          ...(rest.partialShipmentAllowed !== undefined && { partialShipmentAllowed: rest.partialShipmentAllowed }),
          ...(rest.transhipmentAllowed !== undefined && { transhipmentAllowed: rest.transhipmentAllowed }),
          ...(rest.notes !== undefined && { notes: rest.notes }),
        },
        include: { requiredDocs: true, discrepancies: true },
      });
    });
  }

  async transitionStatus(
    tenantId: string,
    id: string,
    userId: string,
    dto: { status: string; notes?: string; submissionDate?: string; bankReferenceNumber?: string },
  ) {
    const lc = await this.prisma.letterOfCredit.findFirst({ where: { id, tenantId } });
    if (!lc) throw new NotFoundException('Letter of Credit not found');

    const allowedNext = TRANSITIONS[lc.status];
    if (!allowedNext) throw new BadRequestException(`No transitions allowed from ${lc.status}`);
    if (dto.status !== allowedNext) {
      throw new BadRequestException(`Invalid transition. Current: ${lc.status}, allowed next: ${allowedNext}`);
    }

    return this.prisma.letterOfCredit.update({
      where: { id },
      data: {
        status: dto.status as any,
        ...(dto.status === 'SUBMITTED' && {
          submissionDate: dto.submissionDate ? new Date(dto.submissionDate) : new Date(),
          bankReferenceNumber: dto.bankReferenceNumber ?? null,
        }),
        ...(dto.notes && { notes: dto.notes }),
      },
    });
  }

  async updateDocStatus(tenantId: string, lcId: string, docId: string, dto: { status: string }) {
    const lc = await this.prisma.letterOfCredit.findFirst({ where: { id: lcId, tenantId } });
    if (!lc) throw new NotFoundException('Letter of Credit not found');
    return this.prisma.lcRequiredDocument.update({
      where: { id: docId },
      data: { status: dto.status as any },
    });
  }

  async addDiscrepancy(tenantId: string, lcId: string, userId: string, dto: any) {
    const lc = await this.prisma.letterOfCredit.findFirst({ where: { id: lcId, tenantId } });
    if (!lc) throw new NotFoundException('Letter of Credit not found');

    return this.prisma.lcDiscrepancy.create({
      data: {
        lcId,
        description: dto.description,
        severity: dto.severity ?? 'BLOCKING',
        documentAffected: dto.documentAffected ?? null,
        bankCharges: dto.bankCharges ?? null,
        createdBy: userId,
      },
    });
  }

  async resolveDiscrepancy(tenantId: string, lcId: string, discId: string, dto: { status: string; resolution?: string }) {
    const lc = await this.prisma.letterOfCredit.findFirst({ where: { id: lcId, tenantId } });
    if (!lc) throw new NotFoundException('Letter of Credit not found');

    return this.prisma.lcDiscrepancy.update({
      where: { id: discId },
      data: {
        status: dto.status as any,
        resolution: dto.resolution ?? null,
        ...(dto.status === 'RESOLVED' || dto.status === 'WAIVED' ? { resolvedAt: new Date() } : {}),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const lc = await this.prisma.letterOfCredit.findFirst({ where: { id, tenantId } });
    if (!lc) throw new NotFoundException('Letter of Credit not found');
    if (lc.status !== 'DRAFT') throw new BadRequestException('Only DRAFT LCs can be deleted');
    await this.prisma.letterOfCredit.delete({ where: { id } });
    return { message: 'Letter of Credit deleted' };
  }
}