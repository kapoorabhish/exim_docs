import React from 'react';
import { Card, Typography, Space, Skeleton } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { colors } from '../tokens/colors';

const { Text } = Typography;

export interface StatCardProps {
  label: string;
  value: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
    label?: string;
  };
  icon?: React.ReactNode;
  accentColor?: string;
  /** Show skeleton loading state while data is being fetched */
  loading?: boolean;
}

export function StatCard({ label, value, trend, icon, accentColor, loading = false }: StatCardProps) {
  const borderColor = accentColor ?? colors.primary[600];
  const isPositive = trend?.direction === 'up';

  if (loading) {
    return (
      <Card size="small" style={{ borderTop: `3px solid ${colors.neutral[200]}` }}>
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      style={{ borderTop: `3px solid ${borderColor}` }}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
          {icon && <span style={{ color: borderColor, fontSize: 18 }}>{icon}</span>}
        </Space>

        <Text style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Text>

        {trend && (
          <Space size={4}>
            {isPositive ? (
              <ArrowUpOutlined style={{ color: colors.success[500], fontSize: 12 }} />
            ) : (
              <ArrowDownOutlined style={{ color: colors.danger[500], fontSize: 12 }} />
            )}
            <Text
              style={{
                fontSize: 12,
                color: isPositive ? colors.success[600] : colors.danger[600],
                fontWeight: 500,
              }}
            >
              {trend.percentage}%
            </Text>
            {trend.label && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {trend.label}
              </Text>
            )}
          </Space>
        )}
      </Space>
    </Card>
  );
}
