import { calculateImportDuty } from './import-duty-calculator';

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

  it('handles zero BCD rate — IGST on CIF only', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0, igstRate: 0.18 });
    expect(result.bcd).toBe(0);
    expect(result.sws).toBe(0);
    expect(result.igst).toBeCloseTo(18000);
  });

  it('handles zero IGST rate', () => {
    const result = calculateImportDuty({ cifValueInr: 100000, bcdRate: 0.10, igstRate: 0 });
    expect(result.igst).toBe(0);
    expect(result.bcd).toBeCloseTo(10000);
  });

  it('calculates correctly for 5% BCD, 12% IGST on 200000 INR CIF', () => {
    const result = calculateImportDuty({ cifValueInr: 200000, bcdRate: 0.05, igstRate: 0.12 });
    const bcd = 10000;
    const sws = 1000;
    const igst = (200000 + bcd + sws) * 0.12;
    expect(result.bcd).toBeCloseTo(bcd);
    expect(result.sws).toBeCloseTo(sws);
    expect(result.igst).toBeCloseTo(igst);
  });
});