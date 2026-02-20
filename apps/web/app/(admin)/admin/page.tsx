'use client';

import React, { useEffect, useState } from 'react';
import {
  App, Card, Col, Row, Statistic, Table, Tag, Typography, Spin,
} from 'antd';
import {
  TeamOutlined, UserOutlined, FileTextOutlined, ShoppingOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@exim/ui';
import api from '../../../lib/api';

const { Text } = Typography;

interface PlatformStats {
  totalTenants: number;
  byStatus: Record<string, number>;
  byPlan: Record<string, number>;
  totalUsers: number;
  totalInvoices: number;
  totalShippingBills: number;
  topTenants: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    _count: { invoices: number };
  }>;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green',
  TRIAL: 'blue',
  SUSPENDED: 'orange',
  EXPIRED: 'red',
};

export default function AdminOverviewPage() {
  const { message } = App.useApp();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data.data || data))
      .catch(() => message.error('Failed to load platform stats'))
      .finally(() => setLoading(false));
  }, [message]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Platform Overview"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Overview' }]}
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Tenants"
              value={stats?.totalTenants ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#4F46E5' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Commercial Invoices"
              value={stats?.totalInvoices ?? 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Shipping Bills"
              value={stats?.totalShippingBills ?? 0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Tenants by Status */}
        <Col xs={24} sm={12}>
          <Card title="Tenants by Status" size="small">
            <Row gutter={[8, 8]}>
              {Object.entries(stats?.byStatus ?? {}).map(([status, count]) => (
                <Col span={12} key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Tag color={STATUS_COLOR[status] ?? 'default'}>{status}</Tag>
                    <Text strong>{count}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Tenants by Plan */}
        <Col xs={24} sm={12}>
          <Card title="Tenants by Plan" size="small">
            <Row gutter={[8, 8]}>
              {Object.entries(stats?.byPlan ?? {}).map(([plan, count]) => (
                <Col span={12} key={plan}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Text>{plan || 'N/A'}</Text>
                    <Text strong>{count}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Top Tenants */}
      <Card title="Top Tenants by Invoice Volume">
        <Table
          dataSource={stats?.topTenants ?? []}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Tenant',
              dataIndex: 'name',
              key: 'name',
              render: (name, r) => (
                <div>
                  <Text strong>{name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{r.slug}</Text>
                </div>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (s) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
            },
            {
              title: 'Plan',
              dataIndex: 'plan',
              key: 'plan',
              render: (p) => p || '—',
            },
            {
              title: 'Invoices',
              key: 'invoices',
              align: 'right',
              render: (_, r) => <Text strong>{r._count?.invoices ?? 0}</Text>,
            },
          ]}
        />
      </Card>
    </>
  );
}