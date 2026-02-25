import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class ForexService {
  constructor(private prisma: PrismaService) {}

  async getGainLossReport(tenantId: string, query: { dateFrom?: string; dateTo?: string; currency?: string }) {
    const { dateFrom, dateTo, currency } = query;
    const where: any = { tenantId };
    if (dateFrom || dateTo) {
      where.paymentDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }
    if (currency) where.currency = currency;

    const payments = await this.prisma.exportPayment.findMany({
      where,
      include: {
        allocations: {
          include: { invoice: { select: { exchangeRate: true } } },
        },
        buyer: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return payments.map((p) => {
      const invoiceRate = p.allocations[0]?.invoice?.exchangeRate ?? null;
      const paymentRate = p.exchangeRate ?? null;
      const foreignAmount = Number(p.foreignAmount);
      let gainLossInr = 0;
      if (invoiceRate && paymentRate) {
        gainLossInr = (Number(paymentRate) - Number(invoiceRate)) * foreignAmount;
      }
      return {
        paymentId: p.id,
        referenceNumber: p.referenceNumber,
        buyerName: (p as any).buyer?.name,
        paymentDate: p.paymentDate,
        currency: p.currency,
        foreignAmount,
        invoiceRate: invoiceRate ? Number(invoiceRate) : null,
        paymentRate: paymentRate ? Number(paymentRate) : null,
        gainLossInr,
        isGain: gainLossInr > 0,
      };
    });
  }

  async getSummary(tenantId: string, query: { dateFrom?: string; dateTo?: string; currency?: string }) {
    const rows = await this.getGainLossReport(tenantId, query);
    const totalGain = rows.filter((r) => r.gainLossInr > 0).reduce((s, r) => s + r.gainLossInr, 0);
    const totalLoss = rows.filter((r) => r.gainLossInr < 0).reduce((s, r) => s + r.gainLossInr, 0);
    return {
      totalTransactions: rows.length,
      totalGainInr: totalGain,
      totalLossInr: Math.abs(totalLoss),
      netInr: totalGain + totalLoss,
      rows,
    };
  }
}