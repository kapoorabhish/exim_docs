import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Space } from 'antd';
import { PlusOutlined, DownloadOutlined, SendOutlined } from '@ant-design/icons';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    intent: {
      control: 'select',
      options: ['primary', 'default', 'export', 'import', 'finance', 'danger'],
    },
    size: {
      control: 'select',
      options: ['small', 'middle', 'large'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
    intent: 'primary',
  },
};

export const AllIntents: Story = {
  render: () => (
    <Space wrap>
      <Button intent="primary">Primary</Button>
      <Button intent="default">Default</Button>
      <Button intent="export">Export</Button>
      <Button intent="import">Import</Button>
      <Button intent="finance">Finance</Button>
      <Button intent="danger">Danger</Button>
    </Space>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Space wrap>
      <Button intent="primary" icon={<PlusOutlined />}>New Invoice</Button>
      <Button intent="export" icon={<SendOutlined />}>Ship</Button>
      <Button intent="default" icon={<DownloadOutlined />}>Download PDF</Button>
    </Space>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Space align="center">
      <Button size="small">Small</Button>
      <Button size="middle">Middle</Button>
      <Button size="large">Large</Button>
    </Space>
  ),
};

export const Loading: Story = {
  args: {
    children: 'Generating PDF...',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};
