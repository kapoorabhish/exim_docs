import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class Gstr3bService {
  constructor(private prisma: PrismaService) {}

  async generateData(tenantId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    const invoices = await this.prisma.commercialInvoice.findMany({
      where: {
        tenantId,
        status: { in: ['FINALIZED', 'LOCKED'] },
        date: { gte: from, lte: to },
      },
      select: { totalAmount: true, gstTreatment: true, exchangeRate: true },
    });

    const lutInvoices = invoices.filter((i) => i.gstTreatment === 'LUT');
    const igstInvoices = invoices.filter((i) => i.gstTreatment === 'WITH_IGST');

    const lutTotal = lutInvoices.reduce((s, i) => s + Number(i.totalAmount) * Number(i.exchangeRate ?? 1), 0);
    const igstTotal = igstInvoices.reduce((s, i) => s + Number(i.totalAmount) * Number(i.exchangeRate ?? 1), 0);
    const igstTax = igstTotal * 0.18;

    const boes = await this.prisma.billOfEntry.findMany({
      where: { tenantId, igstCreditStatus: 'CLAIMED', gstr3bMonth: month },
      select: { igst: true },
    });
    const itcFromImports = boes.reduce((s, b) => s + Number(b.igst), 0);

    return {
      month,
      table31: {
        lut: { taxableValue: lutTotal, igst: 0, invoiceCount: lutInvoices.length },
        withIgst: { taxableValue: igstTotal, igst: igstTax, invoiceCount: igstInvoices.length },
        total: { taxableValue: lutTotal + igstTotal, igst: igstTax },
      },
      table4: {
        itcFromImports,
        boeCount: boes.length,
      },
    };
  }
}