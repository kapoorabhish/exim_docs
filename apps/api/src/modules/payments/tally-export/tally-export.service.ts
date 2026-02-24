import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class TallyExportService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(tenantId: string, query: { dateFrom?: string; dateTo?: string }) {
    const { dateFrom, dateTo } = query;
    const where: any = { tenantId };
    if (dateFrom || dateTo) {
      where.paymentDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }
    return where;
  }

  async getPreview(tenantId: string, query: { dateFrom?: string; dateTo?: string }) {
    const payments = await this.prisma.exportPayment.findMany({
      where: this.buildWhere(tenantId, query),
      include: { buyer: { select: { name: true } } },
      orderBy: { paymentDate: 'asc' },
    });
    return payments.map((p) => ({
      paymentDate: p.paymentDate,
      referenceNumber: p.referenceNumber,
      buyerName: (p as any).buyer?.name,
      amount: Number(p.foreignAmount),
      currency: p.currency,
    }));
  }

  async generateXml(tenantId: string, query: { dateFrom?: string; dateTo?: string }) {
    const payments = await this.prisma.exportPayment.findMany({
      where: this.buildWhere(tenantId, query),
      include: { buyer: { select: { name: true } } },
      orderBy: { paymentDate: 'asc' },
    });

    const entries = payments
      .map((p) => {
        const date = p.paymentDate.toISOString().split('T')[0].replace(/-/g, '');
        return `
    <VOUCHER VCHTYPE="Receipt" ACTION="Create">
      <DATE>${date}</DATE>
      <NARRATION>${p.referenceNumber ?? ''} — ${(p as any).buyer?.name ?? 'Unknown'}</NARRATION>
      <AMOUNT>${Number(p.foreignAmount)}</AMOUNT>
      <CURRENCY>${p.currency}</CURRENCY>
    </VOUCHER>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>${entries}
      </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}