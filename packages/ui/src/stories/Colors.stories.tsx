import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Typography, Space } from 'antd';
import { colors } from '../tokens/colors';

const { Text, Title } = Typography;

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div style={{ textAlign: 'center', width: 80 }}>
      <div
        style={{
          width: 80,
          height: 48,
          backgroundColor: hex,
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
      <Text style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{name}</Text>
      <Text type="secondary" style={{ fontSize: 10 }}>{hex}</Text>
    </div>
  );
}

function ColorScale({ name, scale }: { name: string; scale: Record<string, string> }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <Title level={5} style={{ textTransform: 'capitalize', marginBottom: 12 }}>{name}</Title>
      <Space wrap>
        {Object.entries(scale).map(([shade, hex]) => (
          <ColorSwatch key={shade} name={shade} hex={hex} />
        ))}
      </Space>
    </div>
  );
}

function ColorsPage() {
  return (
    <div>
      <Title level={3}>Color System</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
        EXIM Design System color palette. Indigo/Royal Blue primary with module-specific accents.
      </Text>

      <ColorScale name="Primary (Indigo)" scale={colors.primary} />
      <ColorScale name="Neutral (Slate)" scale={colors.neutral} />
      <ColorScale name="Success (Green)" scale={colors.success} />
      <ColorScale name="Warning (Amber)" scale={colors.warning} />
      <ColorScale name="Danger (Red)" scale={colors.danger} />
      <ColorScale name="Info (Blue)" scale={colors.info} />

      <Title level={4} style={{ marginTop: 32 }}>Module Accents</Title>
      <ColorScale name="Export (Emerald)" scale={colors.module.export} />
      <ColorScale name="Import (Orange)" scale={colors.module.import} />
      <ColorScale name="Finance (Violet)" scale={colors.module.finance} />
      <ColorScale name="Shipping (Cyan)" scale={colors.module.shipping} />
    </div>
  );
}

const meta: Meta = {
  title: 'Foundation/Colors',
  component: ColorsPage,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
