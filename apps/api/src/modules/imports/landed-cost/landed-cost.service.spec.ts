import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LandedCostService } from './landed-cost.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeLandedCost, makeBoe, TENANT_ID, USER_ID, BOE_ID } from '../../../test/fixtures';

describe('LandedCostService', () => {
  let service: LandedCostService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandedCostService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<LandedCostService>(LandedCostService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated landed costs', async () => {
      prisma.landedCost.findMany.mockResolvedValue([makeLandedCost()] as any);
      prisma.landedCost.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies boeId filter', async () => {
      prisma.landedCost.findMany.mockResolvedValue([]);
      prisma.landedCost.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { boeId: BOE_ID });
      expect(prisma.landedCost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ boeId: BOE_ID }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.landedCost.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns landed cost when found', async () => {
      prisma.landedCost.findFirst.mockResolvedValue(makeLandedCost() as any);
      const result = await service.getById(TENANT_ID, 'lc-id');
      expect(result.id).toBe('lc-id');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException when BoE not found', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TENANT_ID, USER_ID, { boeId: 'bad-id', cifValue: 100000, customsDuty: 20000, totalQuantity: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('calculates totalLandedCost as sum of all charges', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      prisma.landedCost.create.mockResolvedValue(makeLandedCost() as any);

      await service.create(TENANT_ID, USER_ID, {
        boeId: BOE_ID,
        cifValue: 417500,
        customsDuty: 129427,
        clearingCharges: 15000,
        handlingCharges: 5000,
        transportCharges: 8000,
        otherCharges: 2000,
        totalQuantity: 100,
      });

      // totalLandedCost = 417500 + 129427 + 15000 + 5000 + 8000 + 2000 = 576927
      expect(prisma.landedCost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalLandedCost: 576927,
            costPerUnit: 5769.27,
          }),
        }),
      );
    });

    it('calculates costPerUnit as totalLandedCost / totalQuantity', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      prisma.landedCost.create.mockResolvedValue(makeLandedCost() as any);

      await service.create(TENANT_ID, USER_ID, {
        boeId: BOE_ID,
        cifValue: 1000,
        customsDuty: 0,
        clearingCharges: 0,
        handlingCharges: 0,
        transportCharges: 0,
        otherCharges: 0,
        totalQuantity: 4,
      });

      expect(prisma.landedCost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalLandedCost: 1000,
            costPerUnit: 250,
          }),
        }),
      );
    });

    it('handles zero charges gracefully', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(makeBoe() as any);
      prisma.landedCost.create.mockResolvedValue(makeLandedCost({ totalLandedCost: 0, costPerUnit: 0 }) as any);

      await service.create(TENANT_ID, USER_ID, {
        boeId: BOE_ID,
        cifValue: 0,
        customsDuty: 0,
        totalQuantity: 10,
      });

      expect(prisma.landedCost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalLandedCost: 0, costPerUnit: 0 }),
        }),
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.landedCost.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('recalculates totalLandedCost and costPerUnit on update', async () => {
      prisma.landedCost.findFirst.mockResolvedValue(makeLandedCost() as any);
      prisma.landedCost.update.mockResolvedValue(makeLandedCost() as any);

      await service.update(TENANT_ID, 'lc-id', {
        clearingCharges: 20000, // was 15000
      });

      expect(prisma.landedCost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalLandedCost: expect.any(Number),
            costPerUnit: expect.any(Number),
          }),
        }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.landedCost.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes the landed cost', async () => {
      prisma.landedCost.findFirst.mockResolvedValue(makeLandedCost() as any);
      prisma.landedCost.delete.mockResolvedValue(makeLandedCost() as any);

      const result = await service.delete(TENANT_ID, 'lc-id');
      expect(result.success).toBe(true);
    });
  });
});