'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, DatePicker,
  InputNumber, Space, Popconfirm, Tabs, Tag, Divider, Steps,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
  MoreOutlined, EyeOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface LC {
  id: string;
  lcNumber: string;
  lcType: string;
  status: string;
  buyerPartyId: string;
  buyer: { name: string };
  issuingBank: string;
  lcAmount: number;
  currency: string;
  expiryDate: string;
  latestShipmentDate?: string;
  requiredDocs?: { id: string; documentType: string; status: string }[];
  discrepancies?: { id: string; description: string; severity: string; status: string }[];
}

interface ComplianceCheck {
  field: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const LC_STATUSES = ['DRAFT', 'ACTIVE', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'PAYMENT_RELEASED', 'CLOSED', 'EXPIRED'];
const LC_TYPES = ['SIGHT', 'USANCE_30', 'USANCE_60', 'USANCE_90', 'USANCE_120'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'CHF', 'CNY', 'AED'];

const LC_STATUS_FLOW = ['DRAFT', 'ACTIVE', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'PAYMENT_RELEASED', 'CLOSED'];

function toLower(s: string) { return s.toLowerCase() as any; }

export default function LcRegisterPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<LC[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);

  // Form drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<LC | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Detail drawer
  const [detailDrawer, setDetailDrawer] = useState<{ open: boolean; lc: LC | null; compliance: { overallStatus: string; checks: ComplianceCheck[] } | null }>({ open: false, lc: null, compliance: null });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/lc', { params });
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
      setTotal(payload.total || 0);
    } catch {
      message.error('Failed to load LC records');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, message]);

  const fetchParties = useCallback(async () => {
    const { data } = await api.get('/parties', { params: { pageSize: 200, type: 'CUSTOMER' } });
    const p = data.data || data;
    setParties(p.data || p);
  }, []);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const openDetail = async (lc: LC) => {
    try {
      const [lcRes, complianceRes] = await Promise.all([
        api.get(`/lc/${lc.id}`),
        api.get(`/lc/${lc.id}/compliance`),
      ]);
      setDetailDrawer({ open: true, lc: lcRes.data.data || lcRes.data, compliance: complianceRes.data.data || complianceRes.data });
    } catch {
      message.error('Failed to load LC details');
    }
  };

  const openDrawer = (lc?: LC) => {
    setEditing(lc || null);
    form.resetFields();
    if (lc) {
      form.setFieldsValue({
        ...lc,
        expiryDate: lc.expiryDate ? dayjs(lc.expiryDate) : null,
        latestShipmentDate: lc.latestShipmentDate ? dayjs(lc.latestShipmentDate) : null,
        presentationPeriod: (lc as any).presentationPeriod,
      });
    }
    setDrawerOpen(true);
  };

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        ...values,
        expiryDate: values.expiryDate?.toISOString(),
        latestShipmentDate: values.latestShipmentDate?.toISOString() ?? null,
      };
      if (editing) {
        await api.put(`/lc/${editing.id}`, body);
        message.success('LC updated');
      } else {
        await api.post('/lc', body);
        message.success('LC created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const transitionStatus = async (id: string, status: string) => {
    try {
      await api.put(`/lc/${id}/status`, { status });
      message.success(`LC status updated to ${status}`);
      fetchRecords();
      if (detailDrawer.open && detailDrawer.lc?.id === id) {
        openDetail({ ...detailDrawer.lc!, status });
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/lc/${id}`);
      message.success('LC deleted');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns: ColumnsType<LC> = [
    {
      title: 'LC Number',
      dataIndex: 'lcNumber',
      key: 'lcNumber',
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{v}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{r.lcType?.replace(/_/g, ' ')}</span>
        </Space>
      ),
    },
    { title: 'Buyer', dataIndex: ['buyer', 'name'], key: 'buyer' },
    { title: 'Issuing Bank', dataIndex: 'issuingBank', key: 'issuingBank' },
    {
      title: 'Amount',
      key: 'amount',
      align: 'right',
      render: (_, r) => `${r.currency} ${Number(r.lcAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d) => {
        const days = dayjs(d).diff(dayjs(), 'day');
        return (
          <Space direction="vertical" size={0}>
            <span>{dayjs(d).format('DD MMM YYYY')}</span>
            <Tag color={days < 0 ? 'red' : days <= 7 ? 'orange' : 'green'} style={{ fontSize: 11 }}>
              {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
            </Tag>
          </Space>
        );
      },
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={toLower(s)} /> },
    {
      title: '',
      key: 'actions',
      render: (_, r) => {
        const curIdx = LC_STATUS_FLOW.indexOf(r.status);
        const nextStatus = curIdx >= 0 && curIdx < LC_STATUS_FLOW.length - 1 ? LC_STATUS_FLOW[curIdx + 1] : null;
        const items: any[] = [
          { key: 'view', label: 'View / Manage', icon: <EyeOutlined />, onClick: () => openDetail(r) },
        ];
        if (r.status === 'DRAFT') {
          items.push({ key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => openDrawer(r) });
        }
        if (nextStatus) {
          items.push({
            key: 'transition',
            label: `Mark as ${nextStatus.replace(/_/g, ' ')}`,
            icon: <CheckOutlined />,
            onClick: () => transitionStatus(r.id, nextStatus),
          });
        }
        if (r.status === 'DRAFT') {
          items.push({ type: 'divider' });
          items.push({
            key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true,
            onClick: () => {/* handled below */},
          });
        }
        return (
          <Space>
            <Dropdown menu={{ items }} trigger={['click']}>
              <Button size="small" icon={<MoreOutlined />} aria-label="Actions" intent="default" />
            </Dropdown>
            {r.status === 'DRAFT' && (
              <Popconfirm title="Delete this LC?" onConfirm={() => onDelete(r.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const lc = detailDrawer.lc;
  const compliance = detailDrawer.compliance;

  return (
    <>
      <PageHeader
        title="LC Register"
        breadcrumbs={[{ label: 'Letter of Credit' }, { label: 'LC Register' }]}
        actions={
          <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New LC
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 180 }}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={LC_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
          />
        </Space>
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
          locale={{
            emptyText: (
              <EmptyState
                type={statusFilter ? 'no-results' : 'no-data'}
                title={statusFilter ? 'No matching LCs' : 'No Letters of Credit'}
                description={statusFilter ? 'Try clearing the status filter.' : 'Create your first LC to get started.'}
                actionLabel={statusFilter ? undefined : 'New LC'}
                onAction={statusFilter ? undefined : () => openDrawer()}
              />
            ),
          }}
        />
      </Card>

      {/* Create / Edit Drawer */}
      <Drawer
        title={editing ? `Edit LC: ${editing.lcNumber}` : 'New Letter of Credit'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button intent="default" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button intent="export" loading={saving} onClick={() => form.submit()}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Divider orientation="left" orientationMargin={0}>LC Details</Divider>
          <Form.Item label="Buyer" name="buyerPartyId" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select buyer"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={parties.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="LC Type" name="lcType" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={LC_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
            </Form.Item>
            <Form.Item label="Currency" name="currency" initialValue="USD" style={{ flex: 1 }}>
              <Select options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
          </Space>
          <Form.Item label="LC Amount" name="lcAmount" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Bank & Dates</Divider>
          <Form.Item label="Issuing Bank" name="issuingBank" rules={[{ required: true }]}>
            <Input placeholder="e.g. HSBC Hong Kong" />
          </Form.Item>
          <Form.Item label="Advising Bank" name="advisingBank">
            <Input placeholder="e.g. HDFC Bank India" />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Expiry Date" name="expiryDate" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Latest Shipment Date" name="latestShipmentDate" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item label="Presentation Period (days)" name="presentationPeriod">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 21" />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Terms</Divider>
          <Form.Item label="Port of Loading" name="portOfLoading">
            <Input placeholder="e.g. INMAA" />
          </Form.Item>
          <Form.Item label="Port of Discharge" name="portOfDischarge">
            <Input placeholder="e.g. USLAX" />
          </Form.Item>
          <Form.Item label="Description of Goods" name="goodsDescription">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Special Conditions" name="specialConditions">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer
        title={lc ? `LC: ${lc.lcNumber}` : 'LC Detail'}
        open={detailDrawer.open}
        onClose={() => setDetailDrawer({ open: false, lc: null, compliance: null })}
        width={960}
      >
        {lc && (
          <Tabs
            items={[
              {
                key: 'details',
                label: 'Details & Compliance',
                children: (
                  <Space direction="vertical" size={24} style={{ width: '100%' }}>
                    <Steps
                      size="small"
                      current={LC_STATUS_FLOW.indexOf(lc.status)}
                      items={LC_STATUS_FLOW.map((s) => ({ title: s.replace(/_/g, ' ') }))}
                    />
                    {compliance && (
                      <Card
                        title={
                          <Space>
                            Compliance Check
                            <Tag color={compliance.overallStatus === 'PASS' ? 'green' : compliance.overallStatus === 'FAIL' ? 'red' : 'orange'}>
                              {compliance.overallStatus}
                            </Tag>
                          </Space>
                        }
                        size="small"
                      >
                        {compliance.checks.map((c) => (
                          <div key={c.field} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <span>{c.label}</span>
                            <Space>
                              <Tag color={c.status === 'PASS' ? 'green' : c.status === 'FAIL' ? 'red' : 'orange'}>{c.status}</Tag>
                              <span style={{ color: '#666', fontSize: 13 }}>{c.message}</span>
                            </Space>
                          </div>
                        ))}
                      </Card>
                    )}
                  </Space>
                ),
              },
              {
                key: 'docs',
                label: `Documents (${lc.requiredDocs?.length ?? 0})`,
                children: (
                  <Table
                    dataSource={lc.requiredDocs || []}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: 'Document Type', dataIndex: 'documentType', key: 'documentType', render: (v) => v?.replace(/_/g, ' ') },
                      { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={toLower(s)} /> },
                    ]}
                    locale={{ emptyText: <EmptyState type="no-data" title="No documents configured" /> }}
                  />
                ),
              },
              {
                key: 'discrepancies',
                label: `Discrepancies (${lc.discrepancies?.length ?? 0})`,
                children: (
                  <Table
                    dataSource={lc.discrepancies || []}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: 'Description', dataIndex: 'description', key: 'description' },
                      { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (v) => <Tag color={v === 'BLOCKING' ? 'red' : 'orange'}>{v}</Tag> },
                      { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={toLower(s)} /> },
                    ]}
                    locale={{ emptyText: <EmptyState type="no-data" title="No discrepancies" /> }}
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </>
  );
}