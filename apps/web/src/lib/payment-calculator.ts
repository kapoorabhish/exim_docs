/**
 * Payment calculation utilities for the Payments module.
 */

/**
 * Calculates the INR equivalent of a foreign currency amount.
 */
export function calculateInrAmount(foreignAmount: number, exchangeRate: number): number {
  return foreignAmount * exchangeRate;
}

/**
 * Returns the age bucket label for a given number of overdue days.
 * "Current" means not yet due (daysOverdue <= 0).
 */
export function calculateAgeBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'Current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

/**
 * Calculates the outstanding balance for an invoice given total amount and paid allocations.
 */
export function calculateOutstandingBalance(totalAmount: number, allocations: number[]): number {
  const paid = allocations.reduce((sum, a) => sum + a, 0);
  return Math.max(0, totalAmount - paid);
}

/**
 * Calculates days overdue from a due date relative to a reference date.
 * Returns 0 if not yet due.
 */
export function calculateDaysOverdue(dueDate: Date, asOfDate: Date = new Date()): number {
  if (dueDate >= asOfDate) return 0;
  return Math.floor((asOfDate.getTime() - dueDate.getTime()) / 86400000);
}