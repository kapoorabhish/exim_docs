import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { calculateImportDuty } from './duty-calculator';

// Valid forward transitions for BoE status
const STATUS_TRANSITIONS: Record<string, string> = {
  DRAFT:         'FILED',
  FILED:         'EXAMINED',
  EXAMINED:      'OUT_OF_CHARGE',
  OUT_OF_CHARGE: 'DUTY_PAID',
};

// Which date field to set on each transition
const STATUS_DATE_FIELD: Record<string, string> = {
  FILED:         'filingDate',
  EXAMINED:      'examinationDate',
  OUT_OF_CHARGE: 'outOfChargeDate',
  DUTY_PAID:     'dutyPaidDate',
};

@Injectable()
export class BillOfEntryService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: {
    status?: string;
    invoiceId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, invoiceId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (invoiceId) where.invoiceId = invoiceId;

    const [data, total] = await Promise.all([
      this.prisma.billOfEntry.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              supplier: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * +pageSize,
        take: +pageSize,
      }),
      this.prisma.billOfEntry.count({ where }),
    ]);
    return { data, total, page: +page, pageSize: +pageSize };
  }

  async getRegister(tenantId: string, query: {
    dateFrom?: string;
    dateTo?: string;
    supplierPartyId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { dateFrom, dateTo, supplierPartyId, status, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (supplierPartyId) {
      where.invoice = { supplierPartyId };
    }

    const [data, total] = await Promise.all([
      this.prisma.billOfEntry.findMany({
        where,
        include: {
          invoice: {
            include: {
              supplier: { select: { id: true, name: true, country: true } },
              po: { select: { id: true, poNumber: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (+page - 1) * +pageSize,
        take: +pageSize,
      }),
      this.prisma.billOfEntry.count({ where }),
    ]);

    const summary = {
      count: total,
      totalAssessedValue: data.reduce((sum, b) => sum + Number(b.assessedValue), 0),
      totalDuty: data.reduce((sum, b) => sum + Number(b.totalDuty), 0),
    };

    return { data, total, page: +page, pageSize: +pageSize, summary };
  }

  async getById(tenantId: string, id: string) {
    const boe = await this.prisma.billOfEntry.findFirst({
      where: { id, tenantId },
      include: {
        invoice: { include: { supplier: true } },
        landedCosts: true,
        importDocs: true,
      },
    });
    if (!boe) throw new NotFoundException('Bill of entry not found');
    return boe;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, bcdRate, igstRate, compensationCessRate, ...rest } = dto;

    const invoice = await this.prisma.supplierInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Supplier invoice not found');

    const cifValueInr = Number(rest.assessedValue ?? 0);
    const duty = calculateImportDuty({
      cifValueInr,
      bcdRate: Number(bcdRate ?? 0),
      igstRate: Number(igstRate ?? 0),
      compensationCessRate: Number(compensationCessRate ?? 0),
    });

    return this.prisma.billOfEntry.create({
      data: {
        ...rest,
        tenantId,
        invoiceId,
        createdBy: userId,
        basicDuty: duty.bcd,
        socialWelfareSurcharge: duty.sws,
        igst: duty.igst,
        compensationCess: duty.compensationCess,
        totalDuty: duty.totalDuty,
      },
      include: { invoice: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const boe = await this.prisma.billOfEntry.findFirst({ where: { id, tenantId } });
    if (!boe) throw new NotFoundException('Bill of entry not found');
    if (boe.status !== 'DRAFT') throw new BadRequestException('Only DRAFT bills of entry can be edited');

    const { bcdRate, igstRate, compensationCessRate, ...rest } = dto;

    let dutyFields = {};
    if (bcdRate !== undefined || igstRate !== undefined || rest.assessedValue !== undefined) {
      const cifValueInr = Number(rest.assessedValue ?? boe.assessedValue);
      const duty = calculateImportDuty({
        cifValueInr,
        bcdRate: Number(bcdRate ?? 0),
        igstRate: Number(igstRate ?? 0),
        compensationCessRate: Number(compensationCessRate ?? 0),
      });
      dutyFields = {
        basicDuty: duty.bcd,
        socialWelfareSurcharge: duty.sws,
        igst: duty.igst,
        compensationCess: duty.compensationCess,
        totalDuty: duty.totalDuty,
      };
    }

    return this.prisma.billOfEntry.update({
      where: { id },
      data: { ...rest, ...dutyFields },
    });
  }

  async transitionStatus(tenantId: string, id: string, dto: { status: string; notes?: string }) {
    const boe = await this.prisma.billOfEntry.findFirst({ where: { id, tenantId } });
    if (!boe) throw new NotFoundException('Bill of entry not found');

    const expectedNext = STATUS_TRANSITIONS[boe.status];
    if (!expectedNext || dto.status !== expectedNext) {
      throw new BadRequestException(
        `Cannot transition from ${boe.status} to ${dto.status}. Expected next status: ${expectedNext ?? 'none'}`,
      );
    }

    const dateField = STATUS_DATE_FIELD[dto.status];
    return this.prisma.billOfEntry.update({
      where: { id },
      data: {
        status: dto.status as any,
        notes: dto.notes ?? boe.notes,
        ...(dateField ? { [dateField]: new Date() } : {}),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const boe = await this.prisma.billOfEntry.findFirst({ where: { id, tenantId } });
    if (!boe) throw new NotFoundException('Bill of entry not found');
    if (boe.status !== 'DRAFT') throw new BadRequestException('Only DRAFT bills of entry can be deleted');
    await this.prisma.billOfEntry.delete({ where: { id } });
    return { success: true };
  }
}