import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { IrpClient } from './irp-client';
import { MockIrpClient } from './irp-client.mock';

@Injectable()
export class EinvoiceService {
  private irpClient: IrpClient;

  constructor(private prisma: PrismaService) {
    this.irpClient = new MockIrpClient();
  }

  async generateIrn(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.commercialInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        buyer: { select: { gstin: true } },
        tenant: { include: { businessProfile: { select: { gstin: true } } } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.irn) throw new BadRequestException('IRN already generated for this invoice');

    const { irn, qrCode } = await this.irpClient.generateIrn({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.date.toISOString().split('T')[0],
      buyerGstin: (invoice as any).buyer?.gstin ?? '',
      totalAmount: Number(invoice.totalAmount),
      tenantGstin: (invoice as any).tenant?.businessProfile?.gstin ?? '',
    });

    return this.prisma.commercialInvoice.update({
      where: { id: invoiceId },
      data: { irn, qrCode },
    });
  }

  async cancelIrn(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.commercialInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.irn) throw new BadRequestException('No IRN to cancel');

    return this.prisma.commercialInvoice.update({
      where: { id: invoiceId },
      data: { irn: null, qrCode: null },
    });
  }
}