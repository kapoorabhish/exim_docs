/**
 * Calculates Indian customs import duty components.
 *
 * Formula:
 *   BCD  = CIF × bcdRate
 *   SWS  = BCD × 10%  (Social Welfare Surcharge — always 10% of BCD)
 *   IGST = (CIF + BCD + SWS) × igstRate
 *   Cess = CIF × compensationCessRate  (default 0)
 *   Total = BCD + SWS + IGST + Cess
 */
export function calculateImportDuty(input: {
  cifValueInr: number;
  bcdRate: number;             // e.g. 0.10 for 10%
  igstRate: number;            // e.g. 0.18 for 18%
  compensationCessRate?: number;
}): {
  bcd: number;
  sws: number;
  igst: number;
  compensationCess: number;
  totalDuty: number;
} {
  const bcd = input.cifValueInr * input.bcdRate;
  const sws = bcd * 0.1;
  const igstBase = input.cifValueInr + bcd + sws;
  const igst = igstBase * input.igstRate;
  const compensationCess = input.cifValueInr * (input.compensationCessRate ?? 0);
  const totalDuty = bcd + sws + igst + compensationCess;

  return { bcd, sws, igst, compensationCess, totalDuty };
}