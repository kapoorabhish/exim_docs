import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Space, Typography } from 'antd';
import { DocumentStatus } from '@exim/shared';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: {
      control: 'select',
      options: Object.values(DocumentStatus),
    },
    size: {
      control: 'select',
      options: ['small', 'default'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = {
  args: {
    status: 'filed',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <Space direction="vertical" size={8}>
      {Object.values(DocumentStatus).map((status) => (
        <Space key={status} size={12}>
          <Typography.Text style={{ width: 80, display: 'inline-block' }}>{status}</Typography.Text>
          <StatusBadge status={status} />
          <StatusBadge status={status} size="small" />
        </Space>
      ))}
    </Space>
  ),
};
