import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Typography, Space, Divider } from 'antd';
import { spacing, borderRadius } from '../tokens/spacing';
import { colors } from '../tokens/colors';

const { Text, Title } = Typography;

function SpacingPage() {
  return (
    <div>
      <Title level={3}>Spacing & Border Radius</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
        Based on a 4px grid system for consistent vertical and horizontal rhythm.
      </Text>

      <Title level={4}>Spacing Scale</Title>
      <Space direction="vertical" size={8} style={{ marginBottom: 32 }}>
        {Object.entries(spacing).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Text type="secondary" style={{ width: 40, textAlign: 'right' }}>{key}</Text>
            <div
              style={{
                width: value,
                height: 24,
                backgroundColor: colors.primary[400],
                borderRadius: 2,
                minWidth: 2,
              }}
            />
            <Text style={{ fontSize: 12 }}>{value}</Text>
          </div>
        ))}
      </Space>

      <Divider />

      <Title level={4}>Border Radius</Title>
      <Space wrap size={16}>
        {Object.entries(borderRadius).map(([key, value]) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                backgroundColor: colors.primary[100],
                border: `2px solid ${colors.primary[400]}`,
                borderRadius: value,
              }}
            />
            <Text style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{key}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{value}</Text>
          </div>
        ))}
      </Space>
    </div>
  );
}

const meta: Meta = {
  title: 'Foundation/Spacing',
  component: SpacingPage,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
