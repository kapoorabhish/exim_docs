/**
 * Client-side import duty calculator.
 * Mirrors the server-side calculateImportDuty() in bill-of-entry/duty-calculator.ts.
 *
 * Formula:
 *   BCD  = CIF × bcdRate
 *   SWS  = BCD × 10%          (Social Welfare Surcharge — always 10% of BCD)
 *   IGST = (CIF + BCD + SWS) × igstRate
 *   Cess = CIF × compensationCessRate
 *   Total = BCD + SWS + IGST + Cess
 */

export interface ImportDutyInput {
  cifValueInr: number;
  bcdRate: number;               // decimal, e.g. 0.10 for 10%
  igstRate: number;              // decimal, e.g. 0.18 for 18%
  compensationCessRate?: number; // decimal, defaults to 0
}

export interface ImportDutyResult {
  bcd: number;
  sws: number;
  igst: number;
  compensationCess: number;
  totalDuty: number;
}

export function calculateImportDuty(input: ImportDutyInput): ImportDutyResult {
  const { cifValueInr, bcdRate, igstRate, compensationCessRate = 0 } = input;
  const bcd = cifValueInr * bcdRate;
  const sws = bcd * 0.1;
  const igstBase = cifValueInr + bcd + sws;
  const igst = igstBase * igstRate;
  const compensationCess = cifValueInr * compensationCessRate;
  return { bcd, sws, igst, compensationCess, totalDuty: bcd + sws + igst + compensationCess };
}