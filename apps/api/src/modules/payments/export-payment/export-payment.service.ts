import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

@Injectable()
export class ExportPaymentService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
  ) {}

  async list(tenantId: string, query: {
    status?: string;
    buyerPartyId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, buyerPartyId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (buyerPartyId) where.buyerPartyId = buyerPartyId;

    const [data, total] = await Promise.all([
      this.prisma.exportPayment.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, country: true } },
          allocations: {
            include: { invoice: { select: { id: true, invoiceNumber: true } } },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.exportPayment.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getById(tenantId: string, id: string) {
    const payment = await this.prisma.exportPayment.findFirst({
      where: { id, tenantId },
      include: {
        buyer: true,
        allocations: {
          include: { invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, currency: true } } },
        },
      },
    });
    if (!payment) throw new NotFoundException('Export payment not found');
    return payment;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const paymentNumber = await this.docNumber.getNextNumber(tenantId, 'EPAY');
    const { allocations = [], ...rest } = dto;

    if (allocations.length > 0) {
      const invoiceIds = allocations.map((a: any) => a.invoiceId);
      const invoices = await this.prisma.commercialInvoice.findMany({
        where: { id: { in: invoiceIds }, tenantId },
      });
      if (invoices.length !== invoiceIds.length) {
        throw new BadRequestException('One or more invoices not found or do not belong to this tenant');
      }
    }

    return this.prisma.exportPayment.create({
      data: {
        ...rest,
        tenantId,
        paymentNumber,
        createdBy: userId,
        allocations: { create: allocations },
      },
      include: {
        buyer: { select: { id: true, name: true } },
        allocations: true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const payment = await this.prisma.exportPayment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Export payment not found');

    const { allocations, ...rest } = dto;
    if (allocations) {
      await this.prisma.paymentInvoiceAllocation.deleteMany({ where: { paymentId: id } });
    }

    return this.prisma.exportPayment.update({
      where: { id },
      data: {
        ...rest,
        allocations: allocations ? { create: allocations } : undefined,
      },
      include: { allocations: true },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const payment = await this.prisma.exportPayment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Export payment not found');
    const allowed = ['PENDING_CLEARANCE', 'CLEARED', 'BOUNCED'];
    if (!allowed.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);
    return this.prisma.exportPayment.update({ where: { id }, data: { status: status as any } });
  }

  async delete(tenantId: string, id: string) {
    const payment = await this.prisma.exportPayment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Export payment not found');
    await this.prisma.exportPayment.delete({ where: { id } });
    return { success: true };
  }

  async getOutstandingReceivables(tenantId: string, query: {
    buyerPartyId?: string;
    currency?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { buyerPartyId, currency, page = 1, pageSize = 50 } = query;
    const where: any = { tenantId, status: { in: ['DRAFT', 'FINALIZED'] } };
    if (buyerPartyId) where.buyerPartyId = buyerPartyId;
    if (currency) where.currency = currency;

    const [invoices, total] = await Promise.all([
      this.prisma.commercialInvoice.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true } },
          paymentAllocations: { select: { allocatedAmount: true } },
        },
        orderBy: { date: 'asc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.commercialInvoice.count({ where }),
    ]);

    const data = invoices.map((inv) => {
      const paid = inv.paymentAllocations.reduce((s, a) => s + Number(a.allocatedAmount), 0);
      const outstanding = Number(inv.totalAmount) - paid;
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        buyer: inv.buyer,
        invoiceDate: inv.date,
        currency: inv.currency,
        totalAmount: Number(inv.totalAmount),
        paid,
        outstanding,
      };
    });

    const summary = {
      totalOutstanding: data.reduce((s, d) => s + d.outstanding, 0),
      count: data.length,
    };

    return { data, summary, total, page: Number(page), pageSize: Number(pageSize) };
  }
}