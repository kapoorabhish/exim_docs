import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Space } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { PageHeader } from './PageHeader';
import { Button } from './Button';

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Export Invoices',
    subtitle: 'Manage your commercial invoices for export shipments',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Exports', href: '/exports' },
      { label: 'Invoices' },
    ],
  },
};

export const WithActions: Story = {
  args: {
    title: 'Shipping Bills',
    subtitle: '12 pending customs clearance',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Exports', href: '/exports' },
      { label: 'Shipping Bills' },
    ],
    actions: (
      <Space>
        <Button intent="default" icon={<DownloadOutlined />}>Export</Button>
        <Button intent="primary" icon={<PlusOutlined />}>New Shipping Bill</Button>
      </Space>
    ),
  },
};

export const Simple: Story = {
  args: {
    title: 'Dashboard',
  },
};
