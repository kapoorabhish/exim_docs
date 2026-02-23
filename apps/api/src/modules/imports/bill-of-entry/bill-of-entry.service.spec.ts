import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillOfEntryService } from './bill-of-entry.service';
import { calculateImportDuty } from './duty-calculator';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeBoe, makeSupplierInvoice, TENANT_ID, USER_ID, SINV_ID, BOE_ID } from '../../../test/fixtures';

// ─── Pure function: calculateImportDuty ─────────────────────────────────────

describe('calculateImportDuty', () => {
  it('calculates BCD correctly', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0.10, igstRate: 0.18 });
    expect(result.bcd).toBeCloseTo(10000);
  });

  it('SWS is always 10% of BCD', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0.10, igstRate: 0.18 });
    expect(result.sws).toBeCloseTo(result.bcd * 0.10);
  });

  it('IGST base includes CIF + BCD + SWS', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0.10, igstRate: 0.18 });
    const expectedIgstBase = 100000 + result.bcd + result.sws;
    expect(result.igst).toBeCloseTo(expectedIgstBase * 0.18);
  });

  it('compensationCess defaults to 0 when not provided', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0.10, igstRate: 0.18 });
    expect(result.compensationCess).toBe(0);
  });

  it('compensationCess is applied on CIF value', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0.10, igstRate: 0.18, compensationCessRate: 0.05 });
    expect(result.compensationCess).toBeCloseTo(5000);
  });

  it('totalDuty equals BCD + SWS + IGST + Cess', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0.10, igstRate: 0.18, compensationCessRate: 0.05 });
    expect(result.totalDuty).toBeCloseTo(result.bcd + result.sws + result.igst + result.compensationCess);
  });

  it('handles zero BCD rate (IGST on CIF only)', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0, igstRate: 0.18 });
    expect(result.bcd).toBe(0);
    expect(result.sws).toBe(0);
    expect(result.igst).toBeCloseTo(18000);
  });
});

// ─── BillOfEntryService ──────────────────────────────────────────────────────

describe('BillOfEntryService', () => {
  let service: BillOfEntryService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillOfEntryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<BillOfEntryService>(BillOfEntryService);
  });

  // ─── list ────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated bills of entry', async () => {
      prisma.billOfEntry.findMany.mockResolvedValue([makeBoe()] as any);
      prisma.billOfEntry.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.billOfEntry.findMany.mockResolvedValue([]);
      prisma.billOfEntry.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'FILED' });
      expect(prisma.billOfEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'FILED' }) }),
      );
    });
  });

  // ─── getById ─────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns BoE when found', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      const result = await service.getById(TENANT_ID, BOE_ID);
      expect(result.id).toBe(BOE_ID);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException when invoice not found', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TENANT_ID, USER_ID, { invoiceId: 'bad-id', assessedValue: 100000, bcdRate: 0.10, igstRate: 0.18 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('auto-calculates duty fields from calculateImportDuty()', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(makeSupplierInvoice() as any);
      prisma.billOfEntry.create.mockResolvedValue(makeBoe() as any);

      await service.create(TENANT_ID, USER_ID, {
        invoiceId: SINV_ID,
        assessedValue: 100000,
        bcdRate: 0.10,
        igstRate: 0.18,
      });

      expect(prisma.billOfEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            basicDuty: 10000,
            socialWelfareSurcharge: 1000,
            igst: expect.any(Number),
            compensationCess: 0,
          }),
        }),
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws BadRequestException when not DRAFT', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe({ status: 'FILED' }) as any);
      await expect(service.update(TENANT_ID, BOE_ID, { portOfEntry: 'INNSA' })).rejects.toThrow(BadRequestException);
    });

    it('updates a DRAFT BoE', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      prisma.billOfEntry.update.mockResolvedValue(makeBoe({ portOfEntry: 'INNSA' }) as any);

      const result = await service.update(TENANT_ID, BOE_ID, { portOfEntry: 'INNSA' });
      expect(result.portOfEntry).toBe('INNSA');
    });
  });

  // ─── transitionStatus ────────────────────────────────────────────────────

  describe('transitionStatus', () => {
    it('transitions DRAFT → FILED and sets filingDate', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      prisma.billOfEntry.update.mockResolvedValue(makeBoe({ status: 'FILED', filingDate: new Date() }) as any);

      const result = await service.transitionStatus(TENANT_ID, BOE_ID, { status: 'FILED' });
      expect(prisma.billOfEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FILED', filingDate: expect.any(Date) }),
        }),
      );
      expect(result.status).toBe('FILED');
    });

    it('transitions FILED → EXAMINED and sets examinationDate', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe({ status: 'FILED' }) as any);
      prisma.billOfEntry.update.mockResolvedValue(makeBoe({ status: 'EXAMINED' }) as any);

      await service.transitionStatus(TENANT_ID, BOE_ID, { status: 'EXAMINED' });
      expect(prisma.billOfEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'EXAMINED', examinationDate: expect.any(Date) }),
        }),
      );
    });

    it('transitions EXAMINED → OUT_OF_CHARGE and sets outOfChargeDate', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe({ status: 'EXAMINED' }) as any);
      prisma.billOfEntry.update.mockResolvedValue(makeBoe({ status: 'OUT_OF_CHARGE' }) as any);

      await service.transitionStatus(TENANT_ID, BOE_ID, { status: 'OUT_OF_CHARGE' });
      expect(prisma.billOfEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'OUT_OF_CHARGE', outOfChargeDate: expect.any(Date) }),
        }),
      );
    });

    it('throws BadRequestException for invalid status jump', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      // DRAFT cannot jump to EXAMINED
      await expect(
        service.transitionStatus(TENANT_ID, BOE_ID, { status: 'EXAMINED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getRegister ─────────────────────────────────────────────────────────

  describe('getRegister', () => {
    it('returns paginated register with summary', async () => {
      prisma.billOfEntry.findMany.mockResolvedValue([makeBoe()] as any);
      prisma.billOfEntry.count.mockResolvedValue(1);

      const result = await service.getRegister(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.summary).toHaveProperty('count');
      expect(result.summary).toHaveProperty('totalAssessedValue');
      expect(result.summary).toHaveProperty('totalDuty');
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws BadRequestException when not DRAFT', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe({ status: 'FILED' }) as any);
      await expect(service.delete(TENANT_ID, BOE_ID)).rejects.toThrow(BadRequestException);
    });

    it('deletes a DRAFT BoE', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      prisma.billOfEntry.delete.mockResolvedValue(makeBoe() as any);

      const result = await service.delete(TENANT_ID, BOE_ID);
      expect(result.success).toBe(true);
    });
  });
});