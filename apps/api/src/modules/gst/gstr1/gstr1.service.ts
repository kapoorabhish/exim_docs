import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class Gstr1Service {
  constructor(private prisma: PrismaService) {}

  async generateTable6a(tenantId: string, month: string) {
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
        shippingBills: {
          select: { sbNumber: true, date: true, portCode: true },
          take: 1,
        },
        buyer: { select: { gstin: true } },
      },
    });

    return invoices.map((inv) => {
      const sb = (inv as any).shippingBills?.[0] ?? null;
      return {
        invoiceNumber: inv.invoiceNumber,
        date: inv.date.toISOString().split('T')[0],
        buyerGstin: (inv as any).buyer?.gstin ?? null,
        invoiceValue: Number(inv.totalAmount),
        igstAmount: inv.gstTreatment === 'WITH_IGST' ? Number(inv.totalAmount) * 0.18 : 0,
        currency: inv.currency,
        exchangeRate: Number(inv.exchangeRate ?? 1),
        shippingBillNumber: sb?.sbNumber ?? null,
        shippingBillDate: sb?.date?.toISOString().split('T')[0] ?? null,
        portCode: sb?.portCode ?? null,
      };
    });
  }

  async markFiled(tenantId: string, dto: { invoiceIds: string[]; month: string }) {
    const { invoiceIds, month } = dto;
    await this.prisma.commercialInvoice.updateMany({
      where: { id: { in: invoiceIds }, tenantId },
      data: { gstr1Filed: true, gstr1Month: month },
    });
    return { updated: invoiceIds.length };
  }

  async getFiledStatus(tenantId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    return this.prisma.commercialInvoice.findMany({
      where: {
        tenantId,
        status: { in: ['FINALIZED', 'LOCKED'] },
        date: { gte: from, lte: to },
      },
      select: {
        id: true,
        invoiceNumber: true,
        gstr1Filed: true,
        gstr1Month: true,
      },
    });
  }
}