/**
 * Client-side demurrage calculator.
 * Mirrors the server-side calculateDemurrage() in import-bl.service.ts.
 *
 * Demurrage starts after freeDays from the arrivalDate.
 * billableDays = max(0, floor((asOfDate - demurrageStart) / 1 day))
 * estimatedCharges = billableDays × dailyRate
 */

export interface DemurrageInput {
  arrivalDate: Date;
  freeDays: number;
  dailyRate: number;       // USD per day
  asOfDate?: Date;         // defaults to today; use for deterministic tests
}

export interface DemurrageResult {
  freeDaysRemaining: number;
  billableDays: number;
  estimatedCharges: number;
  demurrageStartDate: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateDemurrage(input: DemurrageInput): DemurrageResult {
  const { arrivalDate, freeDays, dailyRate, asOfDate } = input;
  const today = asOfDate ?? new Date();
  const demurrageStartDate = new Date(arrivalDate.getTime() + freeDays * MS_PER_DAY);
  const msAfterStart = today.getTime() - demurrageStartDate.getTime();
  const billableDays = Math.max(0, Math.floor(msAfterStart / MS_PER_DAY));
  const freeDaysRemaining = Math.max(0, Math.floor((demurrageStartDate.getTime() - today.getTime()) / MS_PER_DAY));
  return { freeDaysRemaining, billableDays, estimatedCharges: billableDays * dailyRate, demurrageStartDate };
}