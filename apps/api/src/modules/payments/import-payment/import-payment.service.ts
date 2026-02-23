import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

@Injectable()
export class ImportPaymentService {
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
      this.prisma.importPayment.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, country: true } },
          allocations: {
            include: { invoice: { select: { id: true, invoiceNumber: true } } },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.importPayment.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getById(tenantId: string, id: string) {
    const payment = await this.prisma.importPayment.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        allocations: {
          include: { invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, currency: true } } },
        },
      },
    });
    if (!payment) throw new NotFoundException('Import payment not found');
    return payment;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const paymentNumber = await this.docNumber.getNextNumber(tenantId, 'IPAY');
    const { allocations = [], ...rest } = dto;

    if (allocations.length > 0) {
      const invoiceIds = allocations.map((a: any) => a.invoiceId);
      const invoices = await this.prisma.supplierInvoice.findMany({
        where: { id: { in: invoiceIds }, tenantId },
      });
      if (invoices.length !== invoiceIds.length) {
        throw new BadRequestException('One or more supplier invoices not found or do not belong to this tenant');
      }
    }

    return this.prisma.importPayment.create({
      data: {
        ...rest,
        tenantId,
        paymentNumber,
        createdBy: userId,
        allocations: { create: allocations },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        allocations: true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const payment = await this.prisma.importPayment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Import payment not found');

    const { allocations, ...rest } = dto;
    if (allocations) {
      await this.prisma.supplierPaymentAllocation.deleteMany({ where: { paymentId: id } });
    }

    return this.prisma.importPayment.update({
      where: { id },
      data: {
        ...rest,
        allocations: allocations ? { create: allocations } : undefined,
      },
      include: { allocations: true },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const payment = await this.prisma.importPayment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Import payment not found');
    const allowed = ['PENDING', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);
    return this.prisma.importPayment.update({ where: { id }, data: { status: status as any } });
  }

  async delete(tenantId: string, id: string) {
    const payment = await this.prisma.importPayment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Import payment not found');
    await this.prisma.importPayment.delete({ where: { id } });
    return { success: true };
  }

  async getOutstandingPayables(tenantId: string, query: {
    supplierPartyId?: string;
    currency?: string;
    ageBucket?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { supplierPartyId, currency, page = 1, pageSize = 50 } = query;
    const where: any = { tenantId, status: { in: ['DRAFT', 'RECEIVED'] } };
    if (supplierPartyId) where.supplierPartyId = supplierPartyId;
    if (currency) where.currency = currency;

    const [invoices, total] = await Promise.all([
      this.prisma.supplierInvoice.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          paymentAllocations: { select: { allocatedAmount: true } },
        },
        orderBy: { invoiceDate: 'asc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.supplierInvoice.count({ where }),
    ]);

    const today = new Date();
    const data = invoices.map((inv) => {
      const paid = inv.paymentAllocations.reduce((s, a) => s + Number(a.allocatedAmount), 0);
      const outstanding = Number(inv.totalAmount) - paid;
      const dueDate = inv.dueDate;
      const daysOverdue = dueDate && dueDate < today
        ? Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
        : 0;
      const ageBucket = !dueDate || dueDate >= today
        ? 'Current'
        : daysOverdue <= 30 ? '1-30'
        : daysOverdue <= 60 ? '31-60'
        : daysOverdue <= 90 ? '61-90'
        : '90+';

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplier: inv.supplier,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        totalAmount: Number(inv.totalAmount),
        outstanding,
        daysOverdue,
        ageBucket,
      };
    });

    const filtered = query.ageBucket ? data.filter((d) => d.ageBucket === query.ageBucket) : data;
    const summary = {
      totalOutstanding: filtered.reduce((s, d) => s + d.outstanding, 0),
    };

    return { data: filtered, summary, total, page: Number(page), pageSize: Number(pageSize) };
  }
}