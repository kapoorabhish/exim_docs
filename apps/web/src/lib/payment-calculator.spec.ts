import {
  calculateInrAmount,
  calculateAgeBucket,
  calculateOutstandingBalance,
  calculateDaysOverdue,
} from './payment-calculator';

describe('calculateInrAmount', () => {
  it('multiplies foreign amount by exchange rate', () => {
    expect(calculateInrAmount(1000, 83.5)).toBe(83500);
  });

  it('returns 0 for zero foreign amount', () => {
    expect(calculateInrAmount(0, 83.5)).toBe(0);
  });

  it('returns 0 for zero exchange rate', () => {
    expect(calculateInrAmount(1000, 0)).toBe(0);
  });

  it('handles decimal amounts correctly', () => {
    expect(calculateInrAmount(100.50, 83.5)).toBeCloseTo(8391.75, 2);
  });
});

describe('calculateAgeBucket', () => {
  it('returns Current for 0 days overdue', () => {
    expect(calculateAgeBucket(0)).toBe('Current');
  });

  it('returns Current for negative days (future due date)', () => {
    expect(calculateAgeBucket(-5)).toBe('Current');
  });

  it('returns 1-30 for 1 day overdue', () => {
    expect(calculateAgeBucket(1)).toBe('1-30');
  });

  it('returns 1-30 for 30 days overdue', () => {
    expect(calculateAgeBucket(30)).toBe('1-30');
  });

  it('returns 31-60 for 31 days overdue', () => {
    expect(calculateAgeBucket(31)).toBe('31-60');
  });

  it('returns 31-60 for 60 days overdue', () => {
    expect(calculateAgeBucket(60)).toBe('31-60');
  });

  it('returns 61-90 for 61 days overdue', () => {
    expect(calculateAgeBucket(61)).toBe('61-90');
  });

  it('returns 61-90 for 90 days overdue', () => {
    expect(calculateAgeBucket(90)).toBe('61-90');
  });

  it('returns 90+ for 91 days overdue', () => {
    expect(calculateAgeBucket(91)).toBe('90+');
  });

  it('returns 90+ for very large overdue values', () => {
    expect(calculateAgeBucket(365)).toBe('90+');
  });
});

describe('calculateOutstandingBalance', () => {
  it('returns full amount when no allocations', () => {
    expect(calculateOutstandingBalance(10000, [])).toBe(10000);
  });

  it('subtracts single allocation', () => {
    expect(calculateOutstandingBalance(10000, [3000])).toBe(7000);
  });

  it('subtracts multiple allocations', () => {
    expect(calculateOutstandingBalance(10000, [3000, 2000, 1000])).toBe(4000);
  });

  it('returns 0 when fully paid', () => {
    expect(calculateOutstandingBalance(5000, [5000])).toBe(0);
  });

  it('returns 0 (not negative) when over-allocated', () => {
    expect(calculateOutstandingBalance(5000, [6000])).toBe(0);
  });

  it('handles zero total amount', () => {
    expect(calculateOutstandingBalance(0, [])).toBe(0);
  });
});

describe('calculateDaysOverdue', () => {
  it('returns 0 when due date is in the future', () => {
    const futureDate = new Date(Date.now() + 10 * 86400000);
    expect(calculateDaysOverdue(futureDate)).toBe(0);
  });

  it('returns 0 when due date is today', () => {
    const today = new Date();
    expect(calculateDaysOverdue(today)).toBe(0);
  });

  it('returns correct days when past due', () => {
    const asOf = new Date('2026-02-23T00:00:00.000Z');
    const dueDate = new Date('2026-02-13T00:00:00.000Z'); // 10 days ago
    expect(calculateDaysOverdue(dueDate, asOf)).toBe(10);
  });

  it('returns 1 for exactly 1 day overdue', () => {
    const asOf = new Date('2026-02-23T00:00:00.000Z');
    const dueDate = new Date('2026-02-22T00:00:00.000Z');
    expect(calculateDaysOverdue(dueDate, asOf)).toBe(1);
  });

  it('is deterministic with explicit asOfDate', () => {
    const asOf = new Date('2026-02-23T00:00:00.000Z');
    const dueDate = new Date('2026-01-01T00:00:00.000Z'); // 53 days before
    expect(calculateDaysOverdue(dueDate, asOf)).toBe(53);
  });
});