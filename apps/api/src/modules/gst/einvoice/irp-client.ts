export interface IrpClient {
  generateIrn(payload: {
    invoiceNumber: string;
    invoiceDate: string;
    buyerGstin: string;
    totalAmount: number;
    tenantGstin: string;
  }): Promise<{ irn: string; qrCode: string }>;
}