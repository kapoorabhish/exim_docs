import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileSearchOutlined, ContainerOutlined } from '@ant-design/icons';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: 'No invoices yet',
    description: 'Create your first export invoice to get started.',
    actionLabel: 'Create Invoice',
    onAction: () => alert('Create invoice clicked'),
  },
};

export const NoResults: Story = {
  args: {
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
    icon: <FileSearchOutlined />,
  },
};

export const NoShipments: Story = {
  args: {
    title: 'No active shipments',
    description: 'All your shipments have been delivered. Create a new shipment to track.',
    icon: <ContainerOutlined />,
    actionLabel: 'New Shipment',
    onAction: () => alert('New shipment clicked'),
  },
};
