'use client';

import React from 'react';
import { Card, Table, Tag } from 'antd';
import { PageHeader } from '@exim/ui';
import { PERMISSION_MATRIX, ALL_ROLES, ALL_MODULES } from '@exim/shared';

const ACCESS_COLORS: Record<string, string> = {
  FULL: 'green',
  CREATE_EDIT: 'blue',
  VIEW: 'orange',
  NONE: 'default',
};

const columns = [
  {
    title: 'Module',
    dataIndex: 'module',
    key: 'module',
    render: (m: string) => m.charAt(0).toUpperCase() + m.slice(1),
    fixed: 'left' as const,
    width: 140,
  },
  ...ALL_ROLES.map((role) => ({
    title: role.replace(/_/g, ' '),
    key: role,
    width: 120,
    render: (_: unknown, record: { module: string }) => {
      const access = PERMISSION_MATRIX[record.module]?.[role] || 'NONE';
      return <Tag color={ACCESS_COLORS[access]}>{access.replace('_', ' ')}</Tag>;
    },
  })),
];

const dataSource = ALL_MODULES.map((m) => ({ key: m, module: m }));

export default function PermissionsPage() {
  return (
    <>
      <PageHeader
        title="Permission Matrix"
        subtitle="Role-based access control overview (read-only)"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users' }, { label: 'Permissions' }]}
      />

      <Card>
        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>
    </>
  );
}
