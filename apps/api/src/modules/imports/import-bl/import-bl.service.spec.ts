import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImportBlService, calculateDemurrage } from './import-bl.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import {
  makeImportBl,
  makeImportDocument,
  makeSupplierInvoice,
  makeBoe,
  TENANT_ID,
  USER_ID,
  SINV_ID,
  BOE_ID,
} from '../../../test/fixtures';

// ─── Pure function: calculateDemurrage ──────────────────────────────────────

describe('calculateDemurrage', () => {
  const mkDate = (daysAgo: number): Date => {
    const d = new Date('2026-02-23T00:00:00Z');
    d.setDate(d.getDate() - daysAgo);
    return d;
  };
  const TODAY = new Date('2026-02-23T00:00:00Z');

  it('returns 0 billable days when within free period', () => {
    // Arrived 5 days ago, 14 free days — still 9 free days remaining
    const result = calculateDemurrage({
      arrivalDate: mkDate(5),
      freeDays: 14,
      dailyRate: 150,
      asOfDate: TODAY,
    });
    expect(result.billableDays).toBe(0);
    expect(result.estimatedCharges).toBe(0);
    expect(result.freeDaysRemaining).toBeGreaterThan(0);
  });

  it('calculates correct billable days and charges after free period', () => {
    // Arrived 20 days ago, 14 free days — 6 days of demurrage
    const result = calculateDemurrage({
      arrivalDate: mkDate(20),
      freeDays: 14,
      dailyRate: 150,
      asOfDate: TODAY,
    });
    expect(result.billableDays).toBe(6);
    expect(result.estimatedCharges).toBe(900); // 6 × 150
    expect(result.freeDaysRemaining).toBe(0);
  });

  it('returns correct demurrageStartDate', () => {
    const arrivalDate = mkDate(20);
    const result = calculateDemurrage({
      arrivalDate,
      freeDays: 14,
      dailyRate: 150,
      asOfDate: TODAY,
    });
    const expected = new Date(arrivalDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    expect(result.demurrageStartDate.getTime()).toBe(expected.getTime());
  });

  it('returns 0 charges exactly on the last free day', () => {
    // Arrived exactly 14 days ago — today is exactly the demurrage start
    const result = calculateDemurrage({
      arrivalDate: mkDate(14),
      freeDays: 14,
      dailyRate: 150,
      asOfDate: TODAY,
    });
    expect(result.billableDays).toBe(0);
    expect(result.estimatedCharges).toBe(0);
  });

  it('uses asOfDate instead of today for deterministic testing', () => {
    const pastDate = new Date('2026-01-01T00:00:00Z');
    const arrivalDate = new Date('2025-12-01T00:00:00Z');
    // 31 days elapsed, 14 free → 17 billable days
    const result = calculateDemurrage({
      arrivalDate,
      freeDays: 14,
      dailyRate: 200,
      asOfDate: pastDate,
    });
    expect(result.billableDays).toBe(17);
    expect(result.estimatedCharges).toBe(3400); // 17 × 200
  });
});

// ─── ImportBlService ─────────────────────────────────────────────────────────

describe('ImportBlService', () => {
  let service: ImportBlService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportBlService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ImportBlService>(ImportBlService);
  });

  // ─── list ────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated import BLs', async () => {
      prisma.importBillOfLading.findMany.mockResolvedValue([makeImportBl()] as any);
      prisma.importBillOfLading.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies invoiceId filter', async () => {
      prisma.importBillOfLading.findMany.mockResolvedValue([]);
      prisma.importBillOfLading.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { invoiceId: SINV_ID });
      expect(prisma.importBillOfLading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ invoiceId: SINV_ID }) }),
      );
    });
  });

  // ─── getById ─────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns BL when found', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(makeImportBl() as any);
      const result = await service.getById(TENANT_ID, 'import-bl-id');
      expect(result.id).toBe('import-bl-id');
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException when invoice not found', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TENANT_ID, USER_ID, { invoiceId: 'bad-id', blNumber: 'BL001', blDate: new Date() }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates import BL successfully', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(makeSupplierInvoice() as any);
      prisma.importBillOfLading.create.mockResolvedValue(makeImportBl() as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        invoiceId: SINV_ID,
        blNumber: 'MSCUBL123456',
        blDate: new Date(),
      });

      expect(result.blNumber).toBe('MSCUBL123456');
    });
  });

  // ─── updateStatus ────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('transitions RECEIVED → DELIVERY_ORDER_ISSUED', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(makeImportBl() as any);
      prisma.importBillOfLading.update.mockResolvedValue(
        makeImportBl({ status: 'DELIVERY_ORDER_ISSUED' }) as any,
      );

      const result = await service.updateStatus(TENANT_ID, 'import-bl-id', { status: 'DELIVERY_ORDER_ISSUED' });
      expect(result.status).toBe('DELIVERY_ORDER_ISSUED');
    });

    it('transitions DELIVERY_ORDER_ISSUED → CARGO_PICKED_UP', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(
        makeImportBl({ status: 'DELIVERY_ORDER_ISSUED' }) as any,
      );
      prisma.importBillOfLading.update.mockResolvedValue(
        makeImportBl({ status: 'CARGO_PICKED_UP' }) as any,
      );

      const result = await service.updateStatus(TENANT_ID, 'import-bl-id', { status: 'CARGO_PICKED_UP' });
      expect(result.status).toBe('CARGO_PICKED_UP');
    });

    it('throws BadRequestException for invalid status transition', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(makeImportBl() as any);
      // RECEIVED cannot jump to CARGO_PICKED_UP directly
      await expect(
        service.updateStatus(TENANT_ID, 'import-bl-id', { status: 'CARGO_PICKED_UP' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getDemurrage ────────────────────────────────────────────────────────

  describe('getDemurrage', () => {
    it('returns 0 charges when within free period', async () => {
      const recentArrival = new Date();
      recentArrival.setDate(recentArrival.getDate() - 3); // arrived 3 days ago
      prisma.importBillOfLading.findFirst.mockResolvedValue(
        makeImportBl({ arrivalDate: recentArrival, freeDays: 14, dailyDemurrageRate: 150 }) as any,
      );

      const result = await service.getDemurrage(TENANT_ID, 'import-bl-id');
      expect(result.billableDays).toBe(0);
      expect(result.estimatedCharges).toBe(0);
    });

    it('returns correct charges past free period using asOfDate', async () => {
      const arrivalDate = new Date('2026-01-01T00:00:00Z');
      prisma.importBillOfLading.findFirst.mockResolvedValue(
        makeImportBl({ arrivalDate, freeDays: 14, dailyDemurrageRate: 150 }) as any,
      );

      // asOfDate = 20 days after arrival → 6 billable days
      const result = await service.getDemurrage(TENANT_ID, 'import-bl-id', '2026-01-21T00:00:00Z');
      expect(result.billableDays).toBe(6);
      expect(result.estimatedCharges).toBe(900);
    });

    it('returns message when arrivalDate not set', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(
        makeImportBl({ arrivalDate: null }) as any,
      );

      const result = await service.getDemurrage(TENANT_ID, 'import-bl-id') as any;
      expect(result.message).toBeDefined();
    });

    it('throws NotFoundException when BL not found', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(null);
      await expect(service.getDemurrage(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes the BL', async () => {
      prisma.importBillOfLading.findFirst.mockResolvedValue(makeImportBl() as any);
      prisma.importBillOfLading.delete.mockResolvedValue(makeImportBl() as any);

      const result = await service.delete(TENANT_ID, 'import-bl-id');
      expect(result.success).toBe(true);
    });
  });

  // ─── Import Documents ─────────────────────────────────────────────────────

  describe('listDocuments', () => {
    it('returns documents filtered by boeId', async () => {
      prisma.importDocument.findMany.mockResolvedValue([makeImportDocument()] as any);

      const result = await service.listDocuments(TENANT_ID, { boeId: BOE_ID });
      expect(prisma.importDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ boeId: BOE_ID }) }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('createDocument', () => {
    it('throws NotFoundException when BoE not found', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(null);
      await expect(
        service.createDocument(TENANT_ID, USER_ID, { boeId: 'bad-id', documentType: 'COO' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates an import document successfully', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      prisma.importDocument.create.mockResolvedValue(makeImportDocument() as any);

      const result = await service.createDocument(TENANT_ID, USER_ID, {
        boeId: BOE_ID,
        documentType: 'COO',
        documentNumber: 'COO-2025-001',
      });

      expect(result.documentType).toBe('COO');
    });
  });

  describe('getDocument', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.importDocument.findFirst.mockResolvedValue(null);
      await expect(service.getDocument(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns document when found', async () => {
      prisma.importDocument.findFirst.mockResolvedValue(makeImportDocument() as any);
      const result = await service.getDocument(TENANT_ID, 'import-doc-id');
      expect(result.id).toBe('import-doc-id');
    });
  });

  describe('deleteDocument', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.importDocument.findFirst.mockResolvedValue(null);
      await expect(service.deleteDocument(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes the document', async () => {
      prisma.importDocument.findFirst.mockResolvedValue(makeImportDocument() as any);
      prisma.importDocument.delete.mockResolvedValue(makeImportDocument() as any);

      const result = await service.deleteDocument(TENANT_ID, 'import-doc-id');
      expect(result.success).toBe(true);
    });
  });
});