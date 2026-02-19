import React from 'react';
import { Tag } from 'antd';
import {
  DocumentStatusConfig,
  type DocumentStatusType,
} from '@exim/shared';

export interface StatusBadgeProps {
  status: DocumentStatusType;
  size?: 'small' | 'default';
}

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const config = DocumentStatusConfig[status];
  if (!config) return null;

  return (
    <Tag
      color={config.color}
      style={size === 'small' ? { fontSize: 12, lineHeight: '18px', padding: '0 6px' } : undefined}
    >
      {config.label}
    </Tag>
  );
}
