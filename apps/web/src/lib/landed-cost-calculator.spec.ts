import { calculateLandedCost } from './landed-cost-calculator';

describe('calculateLandedCost', () => {
  it('totalLandedCost = sum of all charge components', () => {
    const result = calculateLandedCost({
      cifValue: 500000,
      customsDuty: 60000,
      clearingCharges: 15000,
      handlingCharges: 5000,
      transportCharges: 8000,
      otherCharges: 2000,
      totalQuantity: 100,
    });
    expect(result.totalLandedCost).toBeCloseTo(590000);
  });

  it('costPerUnit = totalLandedCost / totalQuantity', () => {
    const result = calculateLandedCost({
      cifValue: 100000,
      customsDuty: 20000,
      totalQuantity: 50,
    });
    expect(result.costPerUnit).toBeCloseTo(2400); // 120000 / 50
  });

  it('optional charges default to 0 when not provided', () => {
    const result = calculateLandedCost({
      cifValue: 100000,
      customsDuty: 20000,
      totalQuantity: 100,
    });
    expect(result.totalLandedCost).toBeCloseTo(120000);
  });

  it('handles zero optional charges explicitly set to 0', () => {
    const result = calculateLandedCost({
      cifValue: 200000,
      customsDuty: 40000,
      clearingCharges: 0,
      handlingCharges: 0,
      transportCharges: 0,
      otherCharges: 0,
      totalQuantity: 200,
    });
    expect(result.totalLandedCost).toBeCloseTo(240000);
    expect(result.costPerUnit).toBeCloseTo(1200);
  });

  it('returns costPerUnit of 0 when totalQuantity is 0 (avoids divide-by-zero)', () => {
    const result = calculateLandedCost({
      cifValue: 100000,
      customsDuty: 20000,
      totalQuantity: 0,
    });
    expect(result.costPerUnit).toBe(0);
  });

  it('includes all charges in total: clearing + handling + transport + other', () => {
    const result = calculateLandedCost({
      cifValue: 0,
      customsDuty: 0,
      clearingCharges: 1000,
      handlingCharges: 2000,
      transportCharges: 3000,
      otherCharges: 4000,
      totalQuantity: 10,
    });
    expect(result.totalLandedCost).toBe(10000);
    expect(result.costPerUnit).toBe(1000);
  });
});