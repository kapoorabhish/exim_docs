import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExportPaymentService } from './export-payment.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import {
  makeExportPayment, makeInvoice,
  TENANT_ID, USER_ID, EXPORT_PAYMENT_ID,
} from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('EPAY/2025-26/001') };

describe('ExportPaymentService', () => {
  let service: ExportPaymentService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('EPAY/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportPaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<ExportPaymentService>(ExportPaymentService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated export payments', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([makeExportPayment()] as any);
      prisma.exportPayment.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);
      prisma.exportPayment.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'CLEARED' });
      expect(prisma.exportPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'CLEARED' }) }),
      );
    });

    it('applies buyerPartyId filter', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);
      prisma.exportPayment.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { buyerPartyId: 'buyer-1' });
      expect(prisma.exportPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ buyerPartyId: 'buyer-1' }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns payment when found', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(makeExportPayment() as any);
      const result = await service.getById(TENANT_ID, EXPORT_PAYMENT_ID);
      expect(result.id).toBe(EXPORT_PAYMENT_ID);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates payment with auto-generated number', async () => {
      const created = makeExportPayment({ paymentNumber: 'EPAY/2025-26/001' });
      prisma.exportPayment.create.mockResolvedValue(created as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        buyerPartyId: 'buyer-1',
        currency: 'USD',
        foreignAmount: 5000,
        exchangeRate: 83.5,
        inrAmount: 417500,
        paymentMode: 'WIRE_TRANSFER',
        paymentDate: new Date(),
      });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'EPAY');
      expect(result.paymentNumber).toBe('EPAY/2025-26/001');
    });

    it('validates invoice tenant membership when allocations provided', async () => {
      prisma.commercialInvoice.findMany.mockResolvedValue([]);

      await expect(service.create(TENANT_ID, USER_ID, {
        buyerPartyId: 'buyer-1',
        currency: 'USD',
        foreignAmount: 5000,
        exchangeRate: 83.5,
        inrAmount: 417500,
        paymentMode: 'WIRE_TRANSFER',
        paymentDate: new Date(),
        allocations: [{ invoiceId: 'inv-1', allocatedAmount: 5000 }],
      })).rejects.toThrow(BadRequestException);
    });

    it('succeeds with valid invoice allocation', async () => {
      const invoice = makeInvoice();
      prisma.commercialInvoice.findMany.mockResolvedValue([invoice] as any);
      const created = makeExportPayment();
      prisma.exportPayment.create.mockResolvedValue(created as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        buyerPartyId: 'buyer-1',
        currency: 'USD',
        foreignAmount: 5000,
        exchangeRate: 83.5,
        inrAmount: 417500,
        paymentMode: 'WIRE_TRANSFER',
        paymentDate: new Date(),
        allocations: [{ invoiceId: invoice.id, allocatedAmount: 5000 }],
      });
      expect(result.id).toBe(EXPORT_PAYMENT_ID);
    });
  });

  // ─── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('throws NotFoundException when payment not found', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus(TENANT_ID, 'bad-id', 'CLEARED')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid status', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(makeExportPayment() as any);
      await expect(service.updateStatus(TENANT_ID, EXPORT_PAYMENT_ID, 'INVALID')).rejects.toThrow(BadRequestException);
    });

    it('updates to CLEARED status', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(makeExportPayment() as any);
      const updated = makeExportPayment({ status: 'CLEARED' });
      prisma.exportPayment.update.mockResolvedValue(updated as any);

      const result = await service.updateStatus(TENANT_ID, EXPORT_PAYMENT_ID, 'CLEARED');
      expect(result.status).toBe('CLEARED');
    });

    it('updates to BOUNCED status', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(makeExportPayment() as any);
      prisma.exportPayment.update.mockResolvedValue(makeExportPayment({ status: 'BOUNCED' }) as any);

      const result = await service.updateStatus(TENANT_ID, EXPORT_PAYMENT_ID, 'BOUNCED');
      expect(result.status).toBe('BOUNCED');
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes payment successfully', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(makeExportPayment() as any);
      prisma.exportPayment.delete.mockResolvedValue(makeExportPayment() as any);

      const result = await service.delete(TENANT_ID, EXPORT_PAYMENT_ID);
      expect(result.success).toBe(true);
    });
  });

  // ─── getOutstandingReceivables ─────────────────────────────────────────────

  describe('getOutstandingReceivables', () => {
    it('returns invoices with outstanding amounts', async () => {
      const invoice = makeInvoice({ totalAmount: 10000, paymentAllocations: [{ allocatedAmount: 3000 }] });
      prisma.commercialInvoice.findMany.mockResolvedValue([invoice] as any);
      prisma.commercialInvoice.count.mockResolvedValue(1);

      const result = await service.getOutstandingReceivables(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.data[0].outstanding).toBe(7000);
    });

    it('returns zero outstanding for fully paid invoice', async () => {
      const invoice = makeInvoice({ totalAmount: 5000, paymentAllocations: [{ allocatedAmount: 5000 }] });
      prisma.commercialInvoice.findMany.mockResolvedValue([invoice] as any);
      prisma.commercialInvoice.count.mockResolvedValue(1);

      const result = await service.getOutstandingReceivables(TENANT_ID, {});
      expect(result.data[0].outstanding).toBe(0);
    });
  });
});