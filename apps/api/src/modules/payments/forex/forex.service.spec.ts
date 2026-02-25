import { Test, TestingModule } from '@nestjs/testing';
import { ForexService } from './forex.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeExportPayment } from '../../../test/fixtures';

describe('ForexService', () => {
  let service: ForexService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForexService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ForexService>(ForexService);
  });

  describe('getGainLossReport', () => {
    it('returns empty array when no payments found', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      const result = await service.getGainLossReport(TENANT_ID, {});
      expect(result).toEqual([]);
    });

    it('calculates forex gain when payment rate exceeds invoice rate', async () => {
      const payment = makeExportPayment({
        foreignAmount: 1000,
        exchangeRate: 84,
        buyer: { name: 'Test Buyer' },
        allocations: [{ invoice: { exchangeRate: 83 } }],
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getGainLossReport(TENANT_ID, {});
      expect(result[0].gainLossInr).toBe(1000); // (84 - 83) × 1000
      expect(result[0].isGain).toBe(true);
    });

    it('calculates forex loss when payment rate is less than invoice rate', async () => {
      const payment = makeExportPayment({
        foreignAmount: 1000,
        exchangeRate: 82,
        buyer: { name: 'Test Buyer' },
        allocations: [{ invoice: { exchangeRate: 83 } }],
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getGainLossReport(TENANT_ID, {});
      expect(result[0].gainLossInr).toBe(-1000); // (82 - 83) × 1000
      expect(result[0].isGain).toBe(false);
    });

    it('returns zero gain/loss when no invoice rate available', async () => {
      const payment = makeExportPayment({
        foreignAmount: 1000,
        exchangeRate: 84,
        buyer: { name: 'Test Buyer' },
        allocations: [],
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getGainLossReport(TENANT_ID, {});
      expect(result[0].gainLossInr).toBe(0);
    });

    it('applies date range filter', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      await service.getGainLossReport(TENANT_ID, {
        dateFrom: '2025-04-01',
        dateTo: '2025-04-30',
      });

      expect(prisma.exportPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paymentDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('applies currency filter', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      await service.getGainLossReport(TENANT_ID, { currency: 'EUR' });
      expect(prisma.exportPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ currency: 'EUR' }),
        }),
      );
    });

    it('includes required fields in each row', async () => {
      const payment = makeExportPayment({
        buyer: { name: 'Buyer Co' },
        allocations: [],
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getGainLossReport(TENANT_ID, {});
      expect(result[0]).toHaveProperty('paymentId');
      expect(result[0]).toHaveProperty('foreignAmount');
      expect(result[0]).toHaveProperty('gainLossInr');
      expect(result[0]).toHaveProperty('isGain');
    });
  });

  describe('getSummary', () => {
    it('returns totals aggregated from gain/loss report', async () => {
      const payments = [
        makeExportPayment({
          id: 'pay-1',
          foreignAmount: 1000,
          exchangeRate: 85,
          buyer: { name: 'Buyer A' },
          allocations: [{ invoice: { exchangeRate: 83 } }],
        }),
        makeExportPayment({
          id: 'pay-2',
          foreignAmount: 500,
          exchangeRate: 82,
          buyer: { name: 'Buyer B' },
          allocations: [{ invoice: { exchangeRate: 83 } }],
        }),
      ];
      prisma.exportPayment.findMany.mockResolvedValue(payments as any);

      const result = await service.getSummary(TENANT_ID, {});
      expect(result.totalTransactions).toBe(2);
      expect(result.totalGainInr).toBe(2000);   // (85-83) × 1000
      expect(result.totalLossInr).toBe(500);    // |82-83| × 500
      expect(result.netInr).toBe(1500);         // 2000 - 500
    });

    it('returns zeros when no transactions', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      const result = await service.getSummary(TENANT_ID, {});
      expect(result.totalTransactions).toBe(0);
      expect(result.totalGainInr).toBe(0);
      expect(result.totalLossInr).toBe(0);
      expect(result.netInr).toBe(0);
    });
  });
});