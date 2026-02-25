import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class GstReconciliationService {
  constructor(private prisma: PrismaService) {}

  async getSbVsGstr1Mismatches(tenantId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    const invoices = await this.prisma.commercialInvoice.findMany({
      where: {
        tenantId,
        status: { in: ['FINALIZED', 'LOCKED'] },
        date: { gte: from, lte: to },
      },
      include: {
        shippingBills: { select: { sbNumber: true, status: true, totalFobInr: true } },
      },
    });

    return invoices
      .filter((inv) => !(inv as any).shippingBills?.length || !inv.gstr1Filed)
      .map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        totalAmount: Number(inv.totalAmount),
        gstr1Filed: inv.gstr1Filed,
        shippingBillCount: (inv as any).shippingBills?.length ?? 0,
        issue: !(inv as any).shippingBills?.length
          ? 'NO_SHIPPING_BILL'
          : !inv.gstr1Filed
          ? 'NOT_FILED_IN_GSTR1'
          : 'OK',
      }));
  }

  async getBoeVsGstr3bMismatches(tenantId: string, month: string) {
    const boes = await this.prisma.billOfEntry.findMany({
      where: { tenantId, status: 'OUT_OF_CHARGE' },
      include: {
        invoice: { select: { invoiceNumber: true } },
      },
    });

    return boes
      .filter((boe) => boe.igstCreditStatus === 'UNCLAIMED' || boe.gstr3bMonth !== month)
      .map((boe) => ({
        boeId: boe.id,
        boeNumber: boe.boeNumber,
        invoiceNumber: (boe as any).invoice?.invoiceNumber,
        igst: Number(boe.igst),
        igstCreditStatus: boe.igstCreditStatus,
        gstr3bMonth: boe.gstr3bMonth,
        issue: boe.igstCreditStatus === 'UNCLAIMED' ? 'UNCLAIMED_IGST' : 'CLAIMED_DIFFERENT_MONTH',
      }));
  }
}