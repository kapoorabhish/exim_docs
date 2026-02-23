import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class PaymentDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    const next7Days = new Date(today.getTime() + 7 * 86400000);
    const next30Days = new Date(today.getTime() + 30 * 86400000);

    const [
      exportPaymentsThisMonth,
      exportPaymentsLastMonth,
      importPaymentsThisMonth,
      importPaymentsLastMonth,
      overdueSupplierInvoices,
      outstandingExportInvoices,
      upcomingSupplierPayables7,
      upcomingSupplierPayables30,
    ] = await Promise.all([
      this.prisma.exportPayment.aggregate({
        where: { tenantId, status: 'CLEARED', paymentDate: { gte: startOfMonth } },
        _sum: { inrAmount: true },
        _count: true,
      }),
      this.prisma.exportPayment.aggregate({
        where: { tenantId, status: 'CLEARED', paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { inrAmount: true },
        _count: true,
      }),
      this.prisma.importPayment.aggregate({
        where: { tenantId, status: 'COMPLETED', paymentDate: { gte: startOfMonth } },
        _sum: { inrAmount: true },
        _count: true,
      }),
      this.prisma.importPayment.aggregate({
        where: { tenantId, status: 'COMPLETED', paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { inrAmount: true },
        _count: true,
      }),
      this.prisma.supplierInvoice.aggregate({
        where: { tenantId, dueDate: { lt: today }, status: { in: ['DRAFT', 'RECEIVED'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.commercialInvoice.aggregate({
        where: { tenantId, status: { in: ['DRAFT', 'FINALIZED', 'LOCKED'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.supplierInvoice.count({
        where: { tenantId, dueDate: { gte: today, lte: next7Days }, status: { in: ['DRAFT', 'RECEIVED'] } },
      }),
      this.prisma.supplierInvoice.count({
        where: { tenantId, dueDate: { gte: today, lte: next30Days }, status: { in: ['DRAFT', 'RECEIVED'] } },
      }),
    ]);

    const exportInvoices = await this.prisma.commercialInvoice.findMany({
      where: { tenantId, status: { in: ['DRAFT', 'FINALIZED', 'LOCKED'] } },
      include: { buyer: { select: { id: true, name: true } } },
    });

    const buyerTotals = exportInvoices.reduce((acc, inv) => {
      const key = inv.buyerPartyId;
      if (!acc[key]) acc[key] = { buyer: inv.buyer, totalOutstanding: 0 };
      acc[key].totalOutstanding += Number(inv.totalAmount);
      return acc;
    }, {} as Record<string, { buyer: any; totalOutstanding: number }>);

    const top5Buyers = Object.values(buyerTotals)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 5);

    return {
      kpis: {
        totalReceivables: Number(outstandingExportInvoices._sum.totalAmount ?? 0),
        totalPayables: Number(overdueSupplierInvoices._sum.totalAmount ?? 0),
        netPosition: Number(outstandingExportInvoices._sum.totalAmount ?? 0) - Number(overdueSupplierInvoices._sum.totalAmount ?? 0),
        pendingExportInvoices: outstandingExportInvoices._count,
        overduePayablesCount: overdueSupplierInvoices._count,
      },
      collections: {
        thisMonth: Number(exportPaymentsThisMonth._sum.inrAmount ?? 0),
        lastMonth: Number(exportPaymentsLastMonth._sum.inrAmount ?? 0),
      },
      payments: {
        thisMonth: Number(importPaymentsThisMonth._sum.inrAmount ?? 0),
        lastMonth: Number(importPaymentsLastMonth._sum.inrAmount ?? 0),
      },
      upcoming: {
        payables7Days: upcomingSupplierPayables7,
        payables30Days: upcomingSupplierPayables30,
      },
      top5Buyers,
    };
  }

  async getPartyLedger(tenantId: string, partyId: string, query: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const party = await this.prisma.party.findFirst({ where: { id: partyId, tenantId } });
    if (!party) throw new NotFoundException('Party not found');

    const { dateFrom, dateTo, page = 1, pageSize = 50 } = query;
    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    const hasDateFilter = !!(dateFrom || dateTo);

    const [exportInvoices, exportPayments, importInvoices, importPayments, advances] = await Promise.all([
      this.prisma.commercialInvoice.findMany({
        where: { tenantId, buyerPartyId: partyId, ...(hasDateFilter ? { date: dateFilter } : {}) },
        select: { id: true, invoiceNumber: true, date: true, totalAmount: true, currency: true },
      }),
      this.prisma.exportPayment.findMany({
        where: { tenantId, buyerPartyId: partyId, ...(hasDateFilter ? { paymentDate: dateFilter } : {}) },
        select: { id: true, paymentNumber: true, paymentDate: true, inrAmount: true, currency: true },
      }),
      this.prisma.supplierInvoice.findMany({
        where: { tenantId, supplierPartyId: partyId, ...(hasDateFilter ? { invoiceDate: dateFilter } : {}) },
        select: { id: true, invoiceNumber: true, invoiceDate: true, totalAmount: true, currency: true },
      }),
      this.prisma.importPayment.findMany({
        where: { tenantId, supplierPartyId: partyId, ...(hasDateFilter ? { paymentDate: dateFilter } : {}) },
        select: { id: true, paymentNumber: true, paymentDate: true, inrAmount: true, currency: true },
      }),
      this.prisma.advancePayment.findMany({
        where: { tenantId, partyId, ...(hasDateFilter ? { advanceDate: dateFilter } : {}) },
        select: { id: true, advanceNumber: true, advanceDate: true, foreignAmount: true, currency: true, type: true },
      }),
    ]);

    type LedgerEntry = { date: Date; type: string; reference: string; debit: number; credit: number; currency: string };
    const entries: LedgerEntry[] = [];

    for (const inv of exportInvoices) {
      entries.push({ date: inv.date, type: 'Export Invoice', reference: inv.invoiceNumber, debit: Number(inv.totalAmount), credit: 0, currency: inv.currency });
    }
    for (const pmt of exportPayments) {
      entries.push({ date: pmt.paymentDate, type: 'Export Payment', reference: pmt.paymentNumber, debit: 0, credit: Number(pmt.inrAmount), currency: pmt.currency });
    }
    for (const inv of importInvoices) {
      entries.push({ date: inv.invoiceDate, type: 'Supplier Invoice', reference: inv.invoiceNumber, debit: 0, credit: Number(inv.totalAmount), currency: inv.currency });
    }
    for (const pmt of importPayments) {
      entries.push({ date: pmt.paymentDate, type: 'Import Payment', reference: pmt.paymentNumber, debit: Number(pmt.inrAmount), credit: 0, currency: pmt.currency });
    }
    for (const adv of advances) {
      const isReceived = adv.type === 'RECEIVED';
      entries.push({
        date: adv.advanceDate,
        type: `Advance (${adv.type})`,
        reference: adv.advanceNumber,
        debit: isReceived ? 0 : Number(adv.foreignAmount),
        credit: isReceived ? Number(adv.foreignAmount) : 0,
        currency: adv.currency,
      });
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = 0;
    const ledger = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, runningBalance: balance };
    });

    const total = ledger.length;
    const pageData = ledger.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));

    return { party, entries: pageData, closingBalance: balance, total, page: Number(page), pageSize: Number(pageSize) };
  }
}