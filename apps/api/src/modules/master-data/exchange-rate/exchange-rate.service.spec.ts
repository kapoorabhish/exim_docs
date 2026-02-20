import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './exchange-rate.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID } from '../../../test/fixtures';

const makeRate = (overrides: Record<string, unknown> = {}) => ({
  id: 'rate-id',
  currencyCode: 'USD',
  date: new Date('2026-01-01'),
  rateType: 'RBI',
  rate: 83.5,
  source: 'Manual',
  tenantId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ExchangeRateService>(ExchangeRateService);
  });

  // ─── getCurrentRates ───────────────────────────────────────────────────────

  describe('getCurrentRates', () => {
    it('returns deduplicated latest rates per (currency, rateType)', async () => {
      // Two records for USD/RBI — only most recent should appear
      const usdRbi1 = makeRate({ date: new Date('2026-01-01') });
      const usdRbi2 = makeRate({ date: new Date('2026-01-02') });
      prisma.exchangeRate.findMany.mockResolvedValue([usdRbi2, usdRbi1] as any);

      const result = await service.getCurrentRates();
      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(new Date('2026-01-02'));
    });

    it('filters by currency code when provided', async () => {
      prisma.exchangeRate.findMany.mockResolvedValue([makeRate()] as any);

      await service.getCurrentRates('usd');

      expect(prisma.exchangeRate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { currencyCode: 'USD' } }),
      );
    });
  });

  // ─── getRateHistory ────────────────────────────────────────────────────────

  describe('getRateHistory', () => {
    it('returns history for a currency code', async () => {
      prisma.exchangeRate.findMany.mockResolvedValue([makeRate(), makeRate({ date: new Date('2026-01-02') })] as any);

      const result = await service.getRateHistory('USD');
      expect(result).toHaveLength(2);
    });

    it('applies date range filters when provided', async () => {
      prisma.exchangeRate.findMany.mockResolvedValue([] as any);

      await service.getRateHistory('USD', '2026-01-01', '2026-01-31');

      expect(prisma.exchangeRate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ date: { gte: expect.any(Date), lte: expect.any(Date) } }),
        }),
      );
    });
  });

  // ─── setManualRate ─────────────────────────────────────────────────────────

  describe('setManualRate', () => {
    it('upserts a manual exchange rate', async () => {
      prisma.exchangeRate.upsert.mockResolvedValue(makeRate({ rateType: 'MANUAL' }) as any);

      const result = await service.setManualRate(TENANT_ID, {
        currencyCode: 'USD',
        date: '2026-01-15',
        rateType: 'MANUAL',
        rate: 84.0,
      });

      expect(prisma.exchangeRate.upsert).toHaveBeenCalled();
      expect(result).toHaveProperty('rate');
    });

    it('uses Manual as default source', async () => {
      prisma.exchangeRate.upsert.mockResolvedValue(makeRate() as any);

      await service.setManualRate(TENANT_ID, { currencyCode: 'EUR', date: '2026-01-15', rateType: 'MANUAL', rate: 90 });

      expect(prisma.exchangeRate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ source: 'Manual' }),
        }),
      );
    });
  });
});
