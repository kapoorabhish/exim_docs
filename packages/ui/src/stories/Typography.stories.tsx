import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Typography, Space, Divider } from 'antd';
import { typography } from '../tokens/typography';

const { Text, Title } = Typography;

function TypographyPage() {
  return (
    <div>
      <Title level={3}>Typography</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
        EXIM uses Inter as the primary font family for a clean, professional look.
      </Text>

      <Title level={4}>Font Family</Title>
      <div style={{ marginBottom: 24 }}>
        <Text code>{typography.fontFamily.sans}</Text>
        <br />
        <Text code style={{ marginTop: 8, display: 'inline-block' }}>
          Mono: {typography.fontFamily.mono}
        </Text>
      </div>

      <Divider />

      <Title level={4}>Headings</Title>
      <Space direction="vertical" size={16} style={{ marginBottom: 24 }}>
        <div>
          <Title level={1} style={{ margin: 0 }}>Heading 1 — 30px</Title>
          <Text type="secondary">Page titles, hero sections</Text>
        </div>
        <div>
          <Title level={2} style={{ margin: 0 }}>Heading 2 — 24px</Title>
          <Text type="secondary">Section headers</Text>
        </div>
        <div>
          <Title level={3} style={{ margin: 0 }}>Heading 3 — 20px</Title>
          <Text type="secondary">Card titles, modal headers</Text>
        </div>
        <div>
          <Title level={4} style={{ margin: 0 }}>Heading 4 — 16px</Title>
          <Text type="secondary">Subsection headers</Text>
        </div>
        <div>
          <Title level={5} style={{ margin: 0 }}>Heading 5 — 14px</Title>
          <Text type="secondary">Small headers, labels</Text>
        </div>
      </Space>

      <Divider />

      <Title level={4}>Font Sizes</Title>
      <Space direction="vertical" size={8}>
        {Object.entries(typography.fontSize).map(([name, size]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <Text type="secondary" style={{ width: 40, textAlign: 'right' }}>{name}</Text>
            <Text style={{ fontSize: size as string }}>
              The quick brown fox jumps over the lazy dog ({size})
            </Text>
          </div>
        ))}
      </Space>

      <Divider />

      <Title level={4}>Font Weights</Title>
      <Space direction="vertical" size={8}>
        {Object.entries(typography.fontWeight).map(([name, weight]) => (
          <Text key={name} style={{ fontWeight: weight as number, fontSize: 16 }}>
            {name} ({weight}) — The quick brown fox jumps over the lazy dog
          </Text>
        ))}
      </Space>
    </div>
  );
}

const meta: Meta = {
  title: 'Foundation/Typography',
  component: TypographyPage,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
