import React from 'react';
import { Typography, Space } from 'antd';
import { currencies } from '@exim/shared';
import { colors } from '../tokens/colors';

const { Text } = Typography;

export interface CurrencyDisplayProps {
  amount: number;
  currencyCode: string;
  inrEquivalent?: number;
  showCode?: boolean;
  size?: 'small' | 'default' | 'large';
}

function formatAmount(amount: number, decimals: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

const sizeStyles: Record<string, React.CSSProperties> = {
  small: { fontSize: 12 },
  default: { fontSize: 14 },
  large: { fontSize: 18, fontWeight: 600 },
};

export function CurrencyDisplay({
  amount,
  currencyCode,
  inrEquivalent,
  showCode = true,
  size = 'default',
}: CurrencyDisplayProps) {
  const currency = currencies[currencyCode];
  const symbol = currency?.symbol ?? currencyCode;
  const decimals = currency?.decimals ?? 2;

  return (
    <Space direction="vertical" size={0}>
      <Text style={sizeStyles[size]}>
        {symbol} {formatAmount(amount, decimals)}
        {showCode && currencyCode !== 'INR' && (
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
            {currencyCode}
          </Text>
        )}
      </Text>
      {inrEquivalent !== undefined && currencyCode !== 'INR' && (
        <Text style={{ fontSize: 12, color: colors.neutral[400] }}>
          ≈ ₹{formatAmount(inrEquivalent, 2)}
        </Text>
      )}
    </Space>
  );
}
