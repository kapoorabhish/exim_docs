import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IgstCreditService } from './igst-credit.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, BOE_ID, makeBoe } from '../../../test/fixtures';

describe('IgstCreditService', () => {
  let service: IgstCreditService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IgstCreditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<IgstCreditService>(IgstCreditService);
  });

  describe('list', () => {
    it('returns paginated BoE list', async () => {
      prisma.billOfEntry.findMany.mockResolvedValue([makeBoe()] as any);
      prisma.billOfEntry.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter for UNCLAIMED', async () => {
      prisma.billOfEntry.findMany.mockResolvedValue([]);
      prisma.billOfEntry.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'UNCLAIMED' });
      expect(prisma.billOfEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ igstCreditStatus: 'UNCLAIMED' }),
        }),
      );
    });

    it('applies month filter', async () => {
      prisma.billOfEntry.findMany.mockResolvedValue([]);
      prisma.billOfEntry.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { month: '2025-04' });
      expect(prisma.billOfEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gstr3bMonth: '2025-04' }),
        }),
      );
    });
  });

  describe('markClaimed', () => {
    it('throws NotFoundException when BoE not found', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(null);
      await expect(service.markClaimed(TENANT_ID, 'bad-id', { month: '2025-04' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when already claimed', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(
        makeBoe({ igstCreditStatus: 'CLAIMED' }) as any,
      );
      await expect(service.markClaimed(TENANT_ID, BOE_ID, { month: '2025-04' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks BoE as claimed with GSTR-3B month', async () => {
      prisma.billOfEntry.findFirst.mockResolvedValue(
        makeBoe({ igstCreditStatus: 'UNCLAIMED' }) as any,
      );
      prisma.billOfEntry.update.mockResolvedValue(
        makeBoe({ igstCreditStatus: 'CLAIMED', gstr3bMonth: '2025-04' }) as any,
      );

      await service.markClaimed(TENANT_ID, BOE_ID, { month: '2025-04' });
      expect(prisma.billOfEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { igstCreditStatus: 'CLAIMED', gstr3bMonth: '2025-04' },
        }),
      );
    });
  });

  describe('summary', () => {
    it('returns aggregated IGST totals for claimed and unclaimed', async () => {
      prisma.billOfEntry.aggregate
        .mockResolvedValueOnce({ _count: 3, _sum: { igst: 250000 } } as any)
        .mockResolvedValueOnce({ _count: 1, _sum: { igst: 83500 } } as any);

      const result = await service.summary(TENANT_ID);
      expect(result.unclaimed.count).toBe(3);
      expect(result.unclaimed.totalIgst).toBe(250000);
      expect(result.claimed.count).toBe(1);
      expect(result.claimed.totalIgst).toBe(83500);
    });

    it('handles null IGST sum gracefully', async () => {
      prisma.billOfEntry.aggregate
        .mockResolvedValueOnce({ _count: 0, _sum: { igst: null } } as any)
        .mockResolvedValueOnce({ _count: 0, _sum: { igst: null } } as any);

      const result = await service.summary(TENANT_ID);
      expect(result.unclaimed.totalIgst).toBe(0);
      expect(result.claimed.totalIgst).toBe(0);
    });
  });
});