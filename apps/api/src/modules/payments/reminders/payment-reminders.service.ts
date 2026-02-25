import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { differenceInDays } from 'date-fns';

type AgeBucket = 'CURRENT' | '1_30' | '31_60' | '61_90' | 'OVER_90';

function getAgeBucket(daysElapsed: number): AgeBucket {
  if (daysElapsed <= 0) return 'CURRENT';
  if (daysElapsed <= 30) return '1_30';
  if (daysElapsed <= 60) return '31_60';
  if (daysElapsed <= 90) return '61_90';
  return 'OVER_90';
}

@Injectable()
export class PaymentRemindersService {
  constructor(private prisma: PrismaService) {}

  async getAgingReport(tenantId: string) {
    const today = new Date();
    const payments = await this.prisma.exportPayment.findMany({
      where: { tenantId, status: 'PENDING_CLEARANCE' },
      include: {
        buyer: { select: { id: true, name: true, country: true } },
        allocations: {
          include: { invoice: { select: { id: true, invoiceNumber: true, date: true } } },
        },
      },
    });

    return payments.map((p) => {
      const earliestInvoiceDate = p.allocations.reduce((min: Date | null, a: any) => {
        const d = a.invoice?.date;
        if (!d) return min;
        return !min || d < min ? d : min;
      }, null as Date | null);
      const daysElapsed = earliestInvoiceDate ? differenceInDays(today, earliestInvoiceDate) : 0;
      return {
        ...p,
        daysElapsed: Math.max(0, daysElapsed),
        ageBucket: getAgeBucket(daysElapsed),
        earliestInvoiceDate,
      };
    });
  }

  async getCalendarEvents(tenantId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    const invoices = await this.prisma.commercialInvoice.findMany({
      where: {
        tenantId,
        status: { in: ['FINALIZED', 'LOCKED'] },
        date: { gte: from, lte: to },
      },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        totalAmount: true,
        currency: true,
        buyer: { select: { name: true } },
      },
    });

    return invoices.map((inv) => ({
      date: inv.date,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      buyerName: (inv as any).buyer?.name ?? '',
      amount: Number(inv.totalAmount),
      currency: inv.currency,
    }));
  }

  async sendReminder(tenantId: string, paymentId: string) {
    const payment = await this.prisma.exportPayment.findFirst({
      where: { id: paymentId, tenantId },
      include: { buyer: { select: { name: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return { message: `Reminder noted for payment ${paymentId}`, buyerName: (payment as any).buyer?.name };
  }
}