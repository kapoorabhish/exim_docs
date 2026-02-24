import { randomBytes } from 'crypto';
import { IrpClient } from './irp-client';

export class MockIrpClient implements IrpClient {
  async generateIrn(payload: {
    invoiceNumber: string;
    invoiceDate: string;
    buyerGstin: string;
    totalAmount: number;
    tenantGstin: string;
  }): Promise<{ irn: string; qrCode: string }> {
    const irn = randomBytes(32).toString('hex');
    const qrCode = Buffer.from(
      JSON.stringify({ irn, invoice: payload.invoiceNumber, date: payload.invoiceDate }),
    ).toString('base64');
    return { irn, qrCode };
  }
}