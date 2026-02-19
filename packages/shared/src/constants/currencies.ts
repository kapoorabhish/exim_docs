export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const currencies: Record<string, CurrencyInfo> = {
  // Primary trade currencies
  INR: { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '\u20AC', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '\u00A3', name: 'British Pound', decimals: 2 },

  // Gulf / Middle East
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2 },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', decimals: 2 },
  KWD: { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', decimals: 3 },  // 3 decimal places
  BHD: { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', decimals: 3 }, // 3 decimal places
  OMR: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', decimals: 3 },     // 3 decimal places
  QAR: { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', decimals: 2 },

  // Asia Pacific
  JPY: { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen', decimals: 0 },
  CNY: { code: 'CNY', symbol: '\u00A5', name: 'Chinese Yuan', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  THB: { code: 'THB', symbol: '\u0E3F', name: 'Thai Baht', decimals: 2 },
  KRW: { code: 'KRW', symbol: '\u20A9', name: 'South Korean Won', decimals: 0 },
  VND: { code: 'VND', symbol: '\u20AB', name: 'Vietnamese Dong', decimals: 0 },  // 0 decimal places
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0 },    // 0 decimal places

  // South Asia
  BDT: { code: 'BDT', symbol: '\u09F3', name: 'Bangladeshi Taka', decimals: 2 },

  // Americas / Europe
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  TRY: { code: 'TRY', symbol: '\u20BA', name: 'Turkish Lira', decimals: 2 },

  // Africa
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
};

export const defaultCurrency = 'INR';
