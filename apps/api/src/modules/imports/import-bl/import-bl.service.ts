import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

const BL_STATUS_TRANSITIONS: Record<string, string> = {
  RECEIVED:              'DELIVERY_ORDER_ISSUED',
  DELIVERY_ORDER_ISSUED: 'CARGO_PICKED_UP',
};

export function calculateDemurrage(input: {
  arrivalDate: Date;
  freeDays: number;
  dailyRate: number;
  asOfDate?: Date;
}): {
  freeDaysRemaining: number;
  billableDays: number;
  estimatedCharges: number;
  demurrageStartDate: Date;
} {
  const today = input.asOfDate ?? new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const demurrageStartDate = new Date(input.arrivalDate.getTime() + input.freeDays * msPerDay);
  const msAfterStart = today.getTime() - demurrageStartDate.getTime();
  const billableDays = Math.max(0, Math.floor(msAfterStart / msPerDay));
  const msBeforeStart = demurrageStartDate.getTime() - today.getTime();
  const freeDaysRemaining = Math.max(0, Math.floor(msBeforeStart / msPerDay));
  const estimatedCharges = billableDays * input.dailyRate;

  return { freeDaysRemaining, billableDays, estimatedCharges, demurrageStartDate };
}

@Injectable()
export class ImportBlService {
  constructor(private prisma: PrismaService) {}

  // ─── Import B/L ──────────────────────────────────────────

  async list(tenantId: string, query: {
    invoiceId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { invoiceId, status, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (invoiceId) where.invoiceId = invoiceId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.importBillOfLading.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, supplier: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (+page - 1) * +pageSize,
        take: +pageSize,
      }),
      this.prisma.importBillOfLading.count({ where }),
    ]);
    return { data, total, page: +page, pageSize: +pageSize };
  }

  async getById(tenantId: string, id: string) {
    const bl = await this.prisma.importBillOfLading.findFirst({
      where: { id, tenantId },
      include: { invoice: { include: { supplier: true } } },
    });
    if (!bl) throw new NotFoundException('Import bill of lading not found');
    return bl;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, ...rest } = dto;
    const invoice = await this.prisma.supplierInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Supplier invoice not found');

    return this.prisma.importBillOfLading.create({
      data: { ...rest, tenantId, invoiceId, createdBy: userId },
      include: { invoice: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const bl = await this.prisma.importBillOfLading.findFirst({ where: { id, tenantId } });
    if (!bl) throw new NotFoundException('Import bill of lading not found');
    return this.prisma.importBillOfLading.update({ where: { id }, data: dto });
  }

  async updateStatus(tenantId: string, id: string, dto: { status: string }) {
    const bl = await this.prisma.importBillOfLading.findFirst({ where: { id, tenantId } });
    if (!bl) throw new NotFoundException('Import bill of lading not found');

    const expected = BL_STATUS_TRANSITIONS[bl.status];
    if (!expected || dto.status !== expected) {
      throw new BadRequestException(
        `Cannot transition from ${bl.status} to ${dto.status}. Expected: ${expected ?? 'none'}`,
      );
    }

    return this.prisma.importBillOfLading.update({ where: { id }, data: { status: dto.status as any } });
  }

  async getDemurrage(tenantId: string, id: string, asOfDate?: string) {
    const bl = await this.prisma.importBillOfLading.findFirst({ where: { id, tenantId } });
    if (!bl) throw new NotFoundException('Import bill of lading not found');
    if (!bl.arrivalDate) {
      return { freeDaysRemaining: null, billableDays: 0, estimatedCharges: 0, demurrageStartDate: null, message: 'Arrival date not set' };
    }

    return calculateDemurrage({
      arrivalDate: bl.arrivalDate,
      freeDays: bl.freeDays,
      dailyRate: Number(bl.dailyDemurrageRate ?? 0),
      asOfDate: asOfDate ? new Date(asOfDate) : undefined,
    });
  }

  async delete(tenantId: string, id: string) {
    const bl = await this.prisma.importBillOfLading.findFirst({ where: { id, tenantId } });
    if (!bl) throw new NotFoundException('Import bill of lading not found');
    await this.prisma.importBillOfLading.delete({ where: { id } });
    return { success: true };
  }

  // ─── Import Documents ─────────────────────────────────────

  async listDocuments(tenantId: string, query: { boeId?: string; documentType?: string }) {
    const { boeId, documentType } = query;
    const where: any = { tenantId };
    if (boeId) where.boeId = boeId;
    if (documentType) where.documentType = documentType;

    return this.prisma.importDocument.findMany({
      where,
      include: { boe: { select: { id: true, boeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(tenantId: string, userId: string, dto: any) {
    const { boeId, ...rest } = dto;
    const boe = await this.prisma.billOfEntry.findFirst({ where: { id: boeId, tenantId } });
    if (!boe) throw new NotFoundException('Bill of entry not found');

    return this.prisma.importDocument.create({
      data: { ...rest, tenantId, boeId, createdBy: userId },
      include: { boe: true },
    });
  }

  async getDocument(tenantId: string, id: string) {
    const doc = await this.prisma.importDocument.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Import document not found');
    return doc;
  }

  async deleteDocument(tenantId: string, id: string) {
    const doc = await this.prisma.importDocument.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Import document not found');
    await this.prisma.importDocument.delete({ where: { id } });
    return { success: true };
  }
}