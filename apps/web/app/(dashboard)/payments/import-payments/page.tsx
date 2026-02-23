'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Popconfirm, Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

interface Allocation { invoiceId: string; allocatedAmount: number }
interface ImportPayment {
  id: string; paymentNumber: string; paymentDate: string;
  supplierPartyId: string; currency: string; foreignAmount: number;
  exchangeRate: number; inrAmount: number; paymentMode: string;
  bankCharges: number; tdsAmount: number; status: string;
  referenceNumber?: string; notes?: string;
  supplier: { id: string; name: string };
  allocations: (Allocation & { invoice: { id: string; invoiceNumber: string } })[];
}

const PAYMENT_MODES = ['WIRE_TRANSFER', 'LC', 'TT', 'CHEQUE', 'CASH', 'OTHER'].map((m) => ({ value: m, label: m.replace('_', ' ') }));
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AED', 'INR'].map((c) => ({ value: c, label: c }));
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ImportPaymentsPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<ImportPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ImportPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string }[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [form] = Form.useForm();

  const fetchParties = useCallback(async () => {
    try {
      const { data } = await api.get('/parties', { params: { type: 'VENDOR', limit: 200 } });
      const p = data.data || data; setParties(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchInvoices = useCallback(async (supplierPartyId?: string) => {
    try {
      const params: any = { status: 'RECEIVED', limit: 200 };
      if (supplierPartyId) params.supplierPartyId = supplierPartyId;
      const { data } = await api.get('/supplier-invoices', { params });
      const p = data.data || data; setInvoices(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/import-payments', { params });
      const p = data.data || data;
      setRecords(Array.isArray(p) ? p : p.data || []);
      setTotal(p.total || (Array.isArray(p) ? p.length : 0));
    } catch { message.error('Failed to load import payments'); }
    finally { setLoading(false); }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); fetchInvoices(); }, [fetchRecords, fetchParties, fetchInvoices]);

  const openDrawer = (rec?: ImportPayment) => {
    setEditing(rec || null);
    form.resetFields();
    setAllocations([]);
    if (rec) {
      form.setFieldsValue({ ...rec, paymentDate: dayjs(rec.paymentDate) });
      setAllocations(rec.allocations.map((a) => ({ invoiceId: a.invoiceId, allocatedAmount: Number(a.allocatedAmount) })));
    }
    setDrawerOpen(true);
  };

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = { ...values, paymentDate: values.paymentDate?.toISOString(), allocations };
      if (editing) {
        await api.put(`/import-payments/${editing.id}`, body);
        message.success('Payment updated');
      } else {
        await api.post('/import-payments', body);
        message.success('Payment recorded');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const doStatusUpdate = async (id: string, status: string) => {
    try {
      await api.put(`/import-payments/${id}/status`, { status });
      message.success('Status updated');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    }
  };

  const columns: ColumnsType<ImportPayment> = [
    { title: 'Payment #', dataIndex: 'paymentNumber', key: 'paymentNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Date', dataIndex: 'paymentDate', key: 'paymentDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Supplier', dataIndex: ['supplier', 'name'], key: 'supplier' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center' },
    { title: 'Foreign Amount', dataIndex: 'foreignAmount', key: 'foreignAmount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'INR Amount', dataIndex: 'inrAmount', key: 'inrAmount', align: 'right', render: (v) => `₹ ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Mode', dataIndex: 'paymentMode', key: 'paymentMode', render: (m) => <Tag>{m.replace('_', ' ')}</Tag> },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} />,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, rec) => (
        <Space>
          <Button size="small" intent="default" onClick={() => openDrawer(rec)}>Edit</Button>
          {rec.status === 'PENDING' && (
            <Popconfirm title="Mark as Completed?" onConfirm={() => doStatusUpdate(rec.id, 'COMPLETED')} okText="Complete">
              <Button size="small" intent="finance">Complete</Button>
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
        title="Import Payments"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Import Payments' }]}
        actions={
          <Button intent="finance" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            Record Payment
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
              : <EmptyState type="no-data" title="No import payments yet" description="Record your first payment made to a supplier." actionLabel="Record Payment" onAction={() => openDrawer()} />,
          }}
        />
      </Card>

      <Drawer
        title={editing ? `Edit: ${editing.paymentNumber}` : 'Record Import Payment'}
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
          <Form.Item label="Payment Date" name="paymentDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Reference Number" name="referenceNumber">
            <Input placeholder="Bank reference" />
          </Form.Item>

          <Form.Item label="Supplier" name="supplierPartyId" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select supplier"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={parties.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => fetchInvoices(v)}
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

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Payment Mode" name="paymentMode" rules={[{ required: true }]}>
              <Select options={PAYMENT_MODES} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Bank Charges" name="bankCharges" initialValue={0}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item label="TDS Deducted" name="tdsAmount" initialValue={0}>
            <InputNumber min={0} precision={2} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div style={{ marginBottom: 8, fontWeight: 500 }}>Invoice Allocations</div>
          {allocations.map((a, i) => (
            <Space key={i} style={{ marginBottom: 8, width: '100%' }} styles={{ item: { flex: 1 } }}>
              <Select
                placeholder="Select invoice"
                style={{ width: '100%' }}
                value={a.invoiceId || undefined}
                options={invoices.map((inv) => ({ value: inv.id, label: inv.invoiceNumber }))}
                onChange={(v) => { const next = [...allocations]; next[i] = { ...next[i], invoiceId: v }; setAllocations(next); }}
              />
              <InputNumber
                min={0} precision={2} placeholder="Amount"
                value={a.allocatedAmount}
                style={{ width: 140 }}
                onChange={(v) => { const next = [...allocations]; next[i] = { ...next[i], allocatedAmount: v ?? 0 }; setAllocations(next); }}
              />
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setAllocations((p) => p.filter((_, j) => j !== i))} aria-label="Remove allocation" />
            </Space>
          ))}
          <Button size="small" intent="default" icon={<PlusOutlined />} onClick={() => setAllocations((p) => [...p, { invoiceId: '', allocatedAmount: 0 }])}>
            Add Invoice
          </Button>
        </Form>
      </Drawer>
    </>
  );
}