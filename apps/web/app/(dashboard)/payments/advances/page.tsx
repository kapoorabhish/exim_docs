'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

interface AdvancePayment {
  id: string; advanceNumber: string; advanceDate: string;
  type: string; partyId: string; currency: string;
  foreignAmount: number; exchangeRate: number; inrAmount: number;
  adjustedAmount: number; status: string; purpose?: string; notes?: string;
  party: { id: string; name: string };
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AED', 'INR'].map((c) => ({ value: c, label: c }));
const TYPE_OPTIONS = [{ value: 'RECEIVED', label: 'Received (from buyer)' }, { value: 'MADE', label: 'Made (to supplier)' }];
const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PARTIALLY_ADJUSTED', label: 'Partially Adjusted' },
  { value: 'FULLY_ADJUSTED', label: 'Fully Adjusted' },
];

export default function AdvancesPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<AdvancePayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [form] = Form.useForm();

  const fetchParties = useCallback(async () => {
    try {
      const { data } = await api.get('/parties', { params: { limit: 200 } });
      const p = data.data || data; setParties(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/advance-payments', { params });
      const p = data.data || data;
      setRecords(Array.isArray(p) ? p : p.data || []);
      setTotal(p.total || (Array.isArray(p) ? p.length : 0));
    } catch { message.error('Failed to load advances'); }
    finally { setLoading(false); }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      await api.post('/advance-payments', { ...values, advanceDate: values.advanceDate?.toISOString() });
      message.success('Advance recorded');
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const doDelete = async (id: string) => {
    try {
      await api.delete(`/advance-payments/${id}`);
      message.success('Deleted');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns: ColumnsType<AdvancePayment> = [
    { title: 'Advance #', dataIndex: 'advanceNumber', key: 'advanceNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Date', dataIndex: 'advanceDate', key: 'advanceDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Party', dataIndex: ['party', 'name'], key: 'party' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center' },
    { title: 'Amount', dataIndex: 'foreignAmount', key: 'foreignAmount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Adjusted', dataIndex: 'adjustedAmount', key: 'adjustedAmount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} />,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, rec) => (
        <Space>
          {rec.status === 'OPEN' && (
            <Popconfirm title="Delete this advance?" onConfirm={() => doDelete(rec.id)} okText="Delete" okButtonProps={{ danger: true }}>
              <Button size="small" danger intent="default">Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const hasFilters = !!statusFilter;

  return (
    <>
      <PageHeader
        title="Advance Payments"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Advances' }]}
        actions={
          <Button intent="finance" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setDrawerOpen(true); }}>
            Record Advance
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
          />
        </Space>

        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
          locale={{
            emptyText: hasFilters
              ? <EmptyState type="no-results" />
              : <EmptyState type="no-data" title="No advances recorded" description="Record advance payments received from buyers or made to suppliers." actionLabel="Record Advance" onAction={() => { form.resetFields(); setDrawerOpen(true); }} />,
          }}
        />
      </Card>

      <Drawer
        title="Record Advance Payment"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
        footer={
          <Space style={{ float: 'right' }}>
            <Button intent="default" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button intent="finance" loading={saving} onClick={() => form.submit()}>Save</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="Type" name="type" rules={[{ required: true }]} initialValue="RECEIVED">
            <Select options={TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item label="Advance Date" name="advanceDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Party" name="partyId" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select party"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={parties.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Currency" name="currency" initialValue="USD" rules={[{ required: true }]}>
              <Select options={CURRENCIES} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Foreign Amount" name="foreignAmount" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Exchange Rate" name="exchangeRate" rules={[{ required: true }]}>
              <InputNumber min={0} precision={4} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="INR Amount" name="inrAmount" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item label="Purpose" name="purpose">
            <Input placeholder="Purpose of advance" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}