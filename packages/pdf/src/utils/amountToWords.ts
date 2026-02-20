const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function toWordsUnder1000(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWordsUnder1000(n % 100) : '');
}

/**
 * Converts a positive number to English words.
 * e.g. 12345.67 → "Twelve Thousand Three Hundred Forty Five and 67/100"
 */
export function amountToWords(amount: number): string {
  if (isNaN(amount) || amount < 0) return '';

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  const crore = Math.floor(intPart / 10_000_000);
  const lakh = Math.floor((intPart % 10_000_000) / 100_000);
  const thousand = Math.floor((intPart % 100_000) / 1_000);
  const remainder = intPart % 1_000;

  const parts: string[] = [];
  if (crore) parts.push(toWordsUnder1000(crore) + ' Crore');
  if (lakh) parts.push(toWordsUnder1000(lakh) + ' Lakh');
  if (thousand) parts.push(toWordsUnder1000(thousand) + ' Thousand');
  if (remainder) parts.push(toWordsUnder1000(remainder));

  const intWords = parts.length ? parts.join(' ') : 'Zero';
  const decWords = decPart > 0 ? ` and ${decPart}/100` : ' Only';

  return intWords + decWords;
}