import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

// Currencies supported by Frankfurter API (ECB-tracked only).
// GCC currencies (AED, SAR, OMR, KWD, QAR) are NOT in ECB data — enter manually.
const FRANKFURTER_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD'];

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(private prisma: PrismaService) {}

  async getCurrentRates(currencyCode?: string) {
    // Get the most recent rate per currency per rateType
    const where: any = {};
    if (currencyCode) where.currencyCode = currencyCode.toUpperCase();

    const rates = await this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ currencyCode: 'asc' }, { rateType: 'asc' }, { date: 'desc' }],
    });

    // Deduplicate: take the latest per (currencyCode, rateType)
    const seen = new Set<string>();
    const latest: typeof rates = [];
    for (const r of rates) {
      const key = `${r.currencyCode}-${r.rateType}`;
      if (!seen.has(key)) { seen.add(key); latest.push(r); }
    }
    return latest;
  }

  async getRateHistory(currencyCode: string, dateFrom?: string, dateTo?: string) {
    const where: any = { currencyCode: currencyCode.toUpperCase() };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    return this.prisma.exchangeRate.findMany({ where, orderBy: { date: 'asc' } });
  }

  async syncRbiRates(): Promise<{ synced: number; currencies: string[]; error?: string }> {
    // Fetch from Frankfurter API (free, no key required)
    // Fetches 1 INR = X foreign currency, then inverts to get 1 foreign = Y INR
    try {
      const response = await fetch(
        'https://api.frankfurter.app/latest?from=INR&to=' + FRANKFURTER_CURRENCIES.join(','),
      );
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${body}`);
      }

      const json: any = await response.json();
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const rates = json.rates as Record<string, number>;
      let synced = 0;

      for (const [currency, ratePerInr] of Object.entries(rates)) {
        // ratePerInr = X units of foreign currency per 1 INR
        // We want: 1 unit of foreign currency = ? INR
        const inrPerUnit = 1 / ratePerInr;

        // Use findFirst + create/update because Prisma cannot use null in composite unique keys
        const existing = await this.prisma.exchangeRate.findFirst({
          where: { currencyCode: currency, date: today, rateType: 'RBI', tenantId: null },
        });

        if (existing) {
          await this.prisma.exchangeRate.update({
            where: { id: existing.id },
            data: { rate: inrPerUnit, source: 'Frankfurter API (RBI proxy)' },
          });
        } else {
          await this.prisma.exchangeRate.create({
            data: {
              currencyCode: currency,
              date: today,
              rateType: 'RBI',
              rate: inrPerUnit,
              source: 'Frankfurter API (RBI proxy)',
              tenantId: null,
            },
          });
        }
        synced++;
      }

      this.logger.log(`Synced ${synced} exchange rates`);
      return { synced, currencies: Object.keys(rates) };
    } catch (error: any) {
      this.logger.error('Failed to sync exchange rates', error.message);
      return { synced: 0, currencies: [], error: error.message };
    }
  }

  async setManualRate(tenantId: string, dto: { currencyCode: string; date: string; rateType: string; rate: number; source?: string }) {
    const date = new Date(dto.date);
    date.setUTCHours(0, 0, 0, 0);

    return this.prisma.exchangeRate.upsert({
      where: {
        currencyCode_date_rateType_tenantId: {
          currencyCode: dto.currencyCode.toUpperCase(),
          date,
          rateType: 'MANUAL',
          tenantId,
        },
      },
      update: { rate: dto.rate, source: dto.source || 'Manual' },
      create: {
        currencyCode: dto.currencyCode.toUpperCase(),
        date,
        rateType: 'MANUAL',
        rate: dto.rate,
        source: dto.source || 'Manual',
        tenantId,
      },
    });
  }
}