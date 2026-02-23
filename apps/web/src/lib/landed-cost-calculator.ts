/**
 * Client-side landed cost calculator.
 * Mirrors the server-side LandedCostService.create() total calculation.
 *
 * totalLandedCost = cifValue + customsDuty + clearingCharges + handlingCharges + transportCharges + otherCharges
 * costPerUnit     = totalLandedCost / totalQuantity
 */

export interface LandedCostInput {
  cifValue: number;
  customsDuty: number;
  clearingCharges?: number;
  handlingCharges?: number;
  transportCharges?: number;
  otherCharges?: number;
  totalQuantity: number;
}

export interface LandedCostResult {
  totalLandedCost: number;
  costPerUnit: number;
}

export function calculateLandedCost(input: LandedCostInput): LandedCostResult {
  const {
    cifValue,
    customsDuty,
    clearingCharges = 0,
    handlingCharges = 0,
    transportCharges = 0,
    otherCharges = 0,
    totalQuantity,
  } = input;
  const totalLandedCost = cifValue + customsDuty + clearingCharges + handlingCharges + transportCharges + otherCharges;
  const costPerUnit = totalQuantity > 0 ? totalLandedCost / totalQuantity : 0;
  return { totalLandedCost, costPerUnit };
}