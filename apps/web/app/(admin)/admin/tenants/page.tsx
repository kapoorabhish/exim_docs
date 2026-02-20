'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  App, Card, Table, Tag, Space, Drawer, Descriptions, Select, Input, Popconfirm, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

const { Text } = Typography;

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED';
  plan?: string;
  createdAt: string;
  businessProfile?: {
    iecNumber?: string;
    gstNumber?: string;
    pan?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  _count?: {
    users: number;
    parties: number;
    products: number;
    invoices: number;
    shippingBills: number;
  };
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green',
  TRIAL: 'blue',
  SUSPENDED: 'orange',
  EXPIRED: 'red',
};

export default function AdminTenantsPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<TenantDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.q = search;
      const { data } = await api.get('/admin/tenants', { params });
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
      setTotal(payload.total || (Array.isArray(payload) ? payload.length : 0));
    } catch {
      message.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, message]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openDetail = async (tenant: TenantDetail) => {
    setDrawerOpen(true);
    setSelected(tenant);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/admin/tenants/${tenant.id}`);
      setSelected(data.data || data);
    } catch {
      message.error('Failed to load tenant details');
    } finally {
      setDetailLoading(false);
    }
  };

  const setTenantStatus = async (id: string, status: string) => {
    try {
      await api.put(`/admin/tenants/${id}/status`, { status });
      message.success(`Tenant ${status.toLowerCase()}`);
      fetchRecords();
      if (selected?.id === id) {
        setSelected((prev) => prev ? { ...prev, status: status as TenantDetail['status'] } : prev);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const columns: ColumnsType<TenantDetail> = [
    {
      title: 'Tenant',
      key: 'name',
      render: (_, r) => (
        <div>
          <Text
            strong
            style={{ cursor: 'pointer', color: '#4F46E5' }}
            onClick={() => openDetail(r)}
          >
            {r.name}
          </Text>
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
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => dayjs(d).format('DD MMM YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          {r.status !== 'ACTIVE' && (
            <Popconfirm
              title={`Activate "${r.name}"?`}
              onConfirm={() => setTenantStatus(r.id, 'ACTIVE')}
              okText="Activate"
            >
              <Button size="small" intent="default" icon={<CheckCircleOutlined />}>Activate</Button>
            </Popconfirm>
          )}
          {r.status === 'ACTIVE' && (
            <Popconfirm
              title={`Suspend "${r.name}"? Users will lose access.`}
              onConfirm={() => setTenantStatus(r.id, 'SUSPENDED')}
              okText="Suspend"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<StopOutlined />}>Suspend</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tenants"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Tenants' }]}
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by name, IEC, email…"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            value={statusFilter || undefined}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'TRIAL', label: 'Trial' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />
        </Space>

        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        />
      </Card>

      {/* Tenant Detail Drawer */}
      <Drawer
        title={selected?.name ?? 'Tenant Detail'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        loading={detailLoading}
        extra={
          selected && (
            <Tag color={STATUS_COLOR[selected.status] ?? 'default'} style={{ marginRight: 0 }}>
              {selected.status}
            </Tag>
          )
        }
      >
        {selected && (
          <>
            <Descriptions title="Tenant Info" size="small" column={1} bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="Slug">{selected.slug}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[selected.status]}>{selected.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Plan">{selected.plan || '—'}</Descriptions.Item>
              <Descriptions.Item label="Created">{dayjs(selected.createdAt).format('DD MMM YYYY HH:mm')}</Descriptions.Item>
            </Descriptions>

            {selected.businessProfile && (
              <Descriptions title="Business Profile" size="small" column={1} bordered style={{ marginBottom: 24 }}>
                <Descriptions.Item label="IEC">{selected.businessProfile.iecNumber || '—'}</Descriptions.Item>
                <Descriptions.Item label="GST">{selected.businessProfile.gstNumber || '—'}</Descriptions.Item>
                <Descriptions.Item label="PAN">{selected.businessProfile.pan || '—'}</Descriptions.Item>
                <Descriptions.Item label="Email">{selected.businessProfile.email || '—'}</Descriptions.Item>
                <Descriptions.Item label="Phone">{selected.businessProfile.phone || '—'}</Descriptions.Item>
                <Descriptions.Item label="City">{selected.businessProfile.city || '—'}</Descriptions.Item>
                <Descriptions.Item label="State">{selected.businessProfile.state || '—'}</Descriptions.Item>
              </Descriptions>
            )}

            {selected._count && (
              <Descriptions title="Usage" size="small" column={2} bordered style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Users">{selected._count.users}</Descriptions.Item>
                <Descriptions.Item label="Parties">{selected._count.parties}</Descriptions.Item>
                <Descriptions.Item label="Products">{selected._count.products}</Descriptions.Item>
                <Descriptions.Item label="Invoices">{selected._count.invoices}</Descriptions.Item>
                <Descriptions.Item label="Shipping Bills">{selected._count.shippingBills}</Descriptions.Item>
              </Descriptions>
            )}

            {/* Status Actions */}
            <Card size="small" title="Actions" style={{ marginBottom: 16 }}>
              <Space>
                {selected.status !== 'ACTIVE' && (
                  <Popconfirm
                    title={`Activate "${selected.name}"?`}
                    onConfirm={() => setTenantStatus(selected.id, 'ACTIVE')}
                    okText="Activate"
                  >
                    <Button intent="default" icon={<CheckCircleOutlined />}>Activate</Button>
                  </Popconfirm>
                )}
                {selected.status === 'ACTIVE' && (
                  <Popconfirm
                    title={`Suspend "${selected.name}"? Users will lose access.`}
                    onConfirm={() => setTenantStatus(selected.id, 'SUSPENDED')}
                    okText="Suspend"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<StopOutlined />}>Suspend</Button>
                  </Popconfirm>
                )}
                {selected.status !== 'EXPIRED' && (
                  <Popconfirm
                    title={`Mark "${selected.name}" as Expired?`}
                    onConfirm={() => setTenantStatus(selected.id, 'EXPIRED')}
                    okText="Expire"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger>Mark Expired</Button>
                  </Popconfirm>
                )}
              </Space>
            </Card>
          </>
        )}
      </Drawer>
    </>
  );
}