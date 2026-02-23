import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImportPaymentService } from './import-payment.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import {
  makeImportPayment, makeSupplierInvoice,
  TENANT_ID, USER_ID, IMPORT_PAYMENT_ID,
} from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('IPAY/2025-26/001') };

describe('ImportPaymentService', () => {
  let service: ImportPaymentService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('IPAY/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportPaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<ImportPaymentService>(ImportPaymentService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated import payments', async () => {
      prisma.importPayment.findMany.mockResolvedValue([makeImportPayment()] as any);
      prisma.importPayment.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.importPayment.findMany.mockResolvedValue([]);
      prisma.importPayment.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'COMPLETED' });
      expect(prisma.importPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETED' }) }),
      );
    });

    it('applies supplierPartyId filter', async () => {
      prisma.importPayment.findMany.mockResolvedValue([]);
      prisma.importPayment.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { supplierPartyId: 'sup-1' });
      expect(prisma.importPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ supplierPartyId: 'sup-1' }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns payment when found', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(makeImportPayment() as any);
      const result = await service.getById(TENANT_ID, IMPORT_PAYMENT_ID);
      expect(result.id).toBe(IMPORT_PAYMENT_ID);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates payment with auto-generated IPAY number', async () => {
      const created = makeImportPayment({ paymentNumber: 'IPAY/2025-26/001' });
      prisma.importPayment.create.mockResolvedValue(created as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        supplierPartyId: 'sup-1',
        currency: 'USD',
        foreignAmount: 10000,
        exchangeRate: 83.5,
        inrAmount: 835000,
        paymentMode: 'WIRE_TRANSFER',
        paymentDate: new Date(),
      });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'IPAY');
      expect(result.paymentNumber).toBe('IPAY/2025-26/001');
    });

    it('throws BadRequestException when supplier invoice not found during allocation', async () => {
      prisma.supplierInvoice.findMany.mockResolvedValue([]);

      await expect(service.create(TENANT_ID, USER_ID, {
        supplierPartyId: 'sup-1',
        currency: 'USD',
        foreignAmount: 10000,
        exchangeRate: 83.5,
        inrAmount: 835000,
        paymentMode: 'WIRE_TRANSFER',
        paymentDate: new Date(),
        allocations: [{ invoiceId: 'sinv-missing', allocatedAmount: 10000 }],
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus(TENANT_ID, 'bad-id', 'COMPLETED')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid status', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(makeImportPayment() as any);
      await expect(service.updateStatus(TENANT_ID, IMPORT_PAYMENT_ID, 'INVALID')).rejects.toThrow(BadRequestException);
    });

    it('transitions to COMPLETED', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(makeImportPayment() as any);
      prisma.importPayment.update.mockResolvedValue(makeImportPayment({ status: 'COMPLETED' }) as any);

      const result = await service.updateStatus(TENANT_ID, IMPORT_PAYMENT_ID, 'COMPLETED');
      expect(result.status).toBe('COMPLETED');
    });

    it('transitions to CANCELLED', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(makeImportPayment() as any);
      prisma.importPayment.update.mockResolvedValue(makeImportPayment({ status: 'CANCELLED' }) as any);

      const result = await service.updateStatus(TENANT_ID, IMPORT_PAYMENT_ID, 'CANCELLED');
      expect(result.status).toBe('CANCELLED');
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes successfully', async () => {
      prisma.importPayment.findFirst.mockResolvedValue(makeImportPayment() as any);
      prisma.importPayment.delete.mockResolvedValue(makeImportPayment() as any);

      const result = await service.delete(TENANT_ID, IMPORT_PAYMENT_ID);
      expect(result.success).toBe(true);
    });
  });

  // ─── getOutstandingPayables ─────────────────────────────────────────────────

  describe('getOutstandingPayables', () => {
    it('returns invoices with outstanding amounts and age buckets', async () => {
      const pastDue = new Date(Date.now() - 45 * 86400000); // 45 days ago
      const invoice = makeSupplierInvoice({
        totalAmount: 10000,
        dueDate: pastDue,
        paymentAllocations: [{ allocatedAmount: 2000 }],
      });
      prisma.supplierInvoice.findMany.mockResolvedValue([invoice] as any);
      prisma.supplierInvoice.count.mockResolvedValue(1);

      const result = await service.getOutstandingPayables(TENANT_ID, {});
      expect(result.data[0].outstanding).toBe(8000);
      expect(result.data[0].ageBucket).toBe('31-60');
    });

    it('marks current invoices as Current bucket', async () => {
      const futureDate = new Date(Date.now() + 10 * 86400000);
      const invoice = makeSupplierInvoice({
        totalAmount: 5000,
        dueDate: futureDate,
        paymentAllocations: [],
      });
      prisma.supplierInvoice.findMany.mockResolvedValue([invoice] as any);
      prisma.supplierInvoice.count.mockResolvedValue(1);

      const result = await service.getOutstandingPayables(TENANT_ID, {});
      expect(result.data[0].ageBucket).toBe('Current');
    });
  });
});