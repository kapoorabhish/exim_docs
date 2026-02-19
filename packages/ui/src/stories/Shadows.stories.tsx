import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Typography, Space } from 'antd';
import { shadows } from '../tokens/shadows';
import { colors } from '../tokens/colors';

const { Text, Title } = Typography;

function ShadowsPage() {
  return (
    <div>
      <Title level={3}>Shadows / Elevation</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
        Shadow tokens for layering and depth.
      </Text>

      <Space wrap size={24}>
        {Object.entries(shadows).map(([key, value]) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 120,
                height: 80,
                backgroundColor: colors.white,
                borderRadius: 8,
                boxShadow: value,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: key === 'none' ? `1px solid ${colors.neutral[200]}` : 'none',
              }}
            >
              <Text style={{ fontSize: 13 }}>{key}</Text>
            </div>
          </div>
        ))}
      </Space>
    </div>
  );
}

const meta: Meta = {
  title: 'Foundation/Shadows',
  component: ShadowsPage,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
