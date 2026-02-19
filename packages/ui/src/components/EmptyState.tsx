import React from 'react';
import { Button, Typography, Space } from 'antd';
import {
  InboxOutlined,
  SearchOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { colors } from '../tokens/colors';

const { Text } = Typography;

export type EmptyStateType = 'no-data' | 'no-results' | 'no-permission' | 'error';

const TYPE_DEFAULTS: Record<
  EmptyStateType,
  { icon: React.ReactNode; title: string; description: string; actionLabel?: string }
> = {
  'no-data': {
    icon: <InboxOutlined />,
    title: 'No items yet',
    description: 'Get started by creating your first item.',
    actionLabel: 'Create',
  },
  'no-results': {
    icon: <SearchOutlined />,
    title: 'No matching results',
    description: 'Try adjusting your search or filters.',
    actionLabel: 'Clear filters',
  },
  'no-permission': {
    icon: <LockOutlined />,
    title: 'Access restricted',
    description: "You don't have permission to view this content.",
  },
  'error': {
    icon: <ExclamationCircleOutlined />,
    title: 'Something went wrong',
    description: 'An error occurred while loading data.',
    actionLabel: 'Retry',
  },
};

const ICON_COLORS: Record<EmptyStateType, string> = {
  'no-data': colors.neutral[300],
  'no-results': colors.neutral[300],
  'no-permission': colors.warning[400],
  'error': colors.danger[400],
};

export interface EmptyStateProps {
  /** Preset variant — sets default icon, title, description, and action label */
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  type = 'no-data',
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const defaults = TYPE_DEFAULTS[type];
  const resolvedIcon = icon ?? defaults.icon;
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;
  const resolvedActionLabel = actionLabel ?? defaults.actionLabel;
  const iconColor = ICON_COLORS[type];

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <Space direction="vertical" size={16} align="center">
        <span style={{ fontSize: 48, color: iconColor }}>
          {resolvedIcon}
        </span>
        <div>
          <Text strong style={{ fontSize: 16, display: 'block' }}>
            {resolvedTitle}
          </Text>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {resolvedDescription}
          </Text>
        </div>
        {resolvedActionLabel && onAction && (
          <Button
            type={type === 'error' ? 'default' : 'primary'}
            danger={type === 'error'}
            onClick={onAction}
          >
            {resolvedActionLabel}
          </Button>
        )}
      </Space>
    </div>
  );
}
