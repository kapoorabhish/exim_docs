import { calculateDemurrage } from './demurrage-calculator';

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

describe('calculateDemurrage', () => {
  it('returns zero charges and zero billable days when within free period', () => {
    const arrivalDate = daysFromNow(-5);
    const asOfDate = new Date();
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 150, asOfDate });
    expect(result.billableDays).toBe(0);
    expect(result.estimatedCharges).toBe(0);
  });

  it('returns correct free days remaining within free period', () => {
    const arrivalDate = daysFromNow(-5);
    const asOfDate = new Date();
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 150, asOfDate });
    // arrived 5 days ago, 14 free days → 9 free days left
    expect(result.freeDaysRemaining).toBe(9);
  });

  it('calculates billable days correctly past free period', () => {
    const arrivalDate = daysFromNow(-20);
    const asOfDate = new Date();
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 150, asOfDate });
    // 20 - 14 = 6 billable days
    expect(result.billableDays).toBe(6);
  });

  it('calculates estimated charges = billableDays × dailyRate', () => {
    const arrivalDate = daysFromNow(-20);
    const asOfDate = new Date();
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 200, asOfDate });
    expect(result.estimatedCharges).toBe(result.billableDays * 200);
  });

  it('returns demurrageStartDate as arrivalDate + freeDays', () => {
    const arrivalDate = new Date('2026-01-01T00:00:00.000Z');
    const asOfDate = new Date('2026-01-20T00:00:00.000Z');
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 100, asOfDate });
    expect(result.demurrageStartDate.toISOString().startsWith('2026-01-15')).toBe(true);
  });

  it('returns 0 free days remaining when past free period', () => {
    const arrivalDate = daysFromNow(-30);
    const asOfDate = new Date();
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 100, asOfDate });
    expect(result.freeDaysRemaining).toBe(0);
  });

  it('is deterministic with asOfDate parameter', () => {
    const arrivalDate = new Date('2026-01-01T00:00:00.000Z');
    const asOfDate = new Date('2026-01-20T00:00:00.000Z');
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 150, asOfDate });
    // demurrageStart = Jan 15; asOf = Jan 20 → 5 billable days (Jan 15–19)
    expect(result.billableDays).toBe(5);
    expect(result.estimatedCharges).toBe(750);
    expect(result.freeDaysRemaining).toBe(0);
  });

  it('returns zero charges on exactly the last free day', () => {
    const arrivalDate = new Date('2026-01-01T00:00:00.000Z');
    const asOfDate = new Date('2026-01-14T12:00:00.000Z'); // within day 14
    const result = calculateDemurrage({ arrivalDate, freeDays: 14, dailyRate: 150, asOfDate });
    expect(result.billableDays).toBe(0);
    expect(result.estimatedCharges).toBe(0);
  });
});