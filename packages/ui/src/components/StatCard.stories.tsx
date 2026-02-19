import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  DollarOutlined,
  ExportOutlined,
  ImportOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { StatCard } from './StatCard';
import { colors } from '../tokens/colors';

const meta: Meta<typeof StatCard> = {
  title: 'Components/StatCard',
  component: StatCard,
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    label: 'Total Exports (YTD)',
    value: '$2.4M',
    trend: { direction: 'up', percentage: 12.5, label: 'vs last year' },
    icon: <ExportOutlined />,
  },
};

export const DashboardKPIs: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      <StatCard
        label="Total Exports (YTD)"
        value="$2.4M"
        trend={{ direction: 'up', percentage: 12.5, label: 'vs last year' }}
        icon={<ExportOutlined />}
        accentColor={colors.module.export[600]}
      />
      <StatCard
        label="Total Imports (YTD)"
        value="$1.8M"
        trend={{ direction: 'down', percentage: 3.2, label: 'vs last year' }}
        icon={<ImportOutlined />}
        accentColor={colors.module.import[600]}
      />
      <StatCard
        label="Outstanding Receivables"
        value="₹45.2L"
        trend={{ direction: 'up', percentage: 8.1, label: 'vs last month' }}
        icon={<DollarOutlined />}
        accentColor={colors.module.finance[600]}
      />
      <StatCard
        label="Pending Documents"
        value="23"
        icon={<FileTextOutlined />}
        accentColor={colors.warning[500]}
      />
    </div>
  ),
};

export const NoTrend: Story = {
  args: {
    label: 'Shipments in Transit',
    value: '7',
    icon: <ImportOutlined />,
    accentColor: colors.module.shipping[600],
  },
};
