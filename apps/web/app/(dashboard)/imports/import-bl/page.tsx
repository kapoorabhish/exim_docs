'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Popconfirm, Modal,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

interface ImportBl {
  id: string; invoiceId: string; blNumber: string; blDate: string;
  shippingLine?: string; vesselName?: string; containerNumbers?: string;
  portOfLoading?: string; portOfDischarge?: string; arrivalDate?: string;
  freeDays: number; dailyDemurrageRate?: number;
  deliveryOrderNumber?: string; deliveryOrderDate?: string;
  status: string; documentUrl?: string; notes?: string;
  invoice: { id: string; invoiceNumber: string };
}

interface DemurrageInfo {
  freeDaysRemaining: number;
  billableDays: number;
  estimatedCharges: number;
  demurrageStartDate: string;
}

const STATUS_OPTIONS = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'DELIVERY_ORDER_ISSUED', label: 'D/O Issued' },
  { value: 'CARGO_PICKED_UP', label: 'Cargo Picked Up' },
];

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }> = {
  RECEIVED: { label: 'Issue D/O', next: 'DELIVERY_ORDER_ISSUED' },
  DELIVERY_ORDER_ISSUED: { label: 'Mark Cargo Picked Up', next: 'CARGO_PICKED_UP' },
};

function getFreeDaysRemaining(arrivalDate?: string, freeDays: number = 14): number {
  if (!arrivalDate) return freeDays;
  const arrival = dayjs(arrivalDate);
  const freeUntil = arrival.add(freeDays, 'day');
  const remaining = freeUntil.diff(dayjs(), 'day');
  return Math.max(0, remaining);
}

export default function ImportBlPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<ImportBl[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ImportBl | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string }[]>([]);
  const [form] = Form.useForm();
  const [demurrageModal, setDemurrageModal] = useState<{ open: boolean; bl?: ImportBl; info?: DemurrageInfo }>({ open: false });

  const fetchInvoices = useCallback(async () => {
    try {
      const { data } = await api.get('/supplier-invoices', { params: { limit: 200 } });
      const p = data.data || data; setInvoices(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/import-bls', { params });
      const p = data.data || data;
      setRecords(Array.isArray(p) ? p : p.data || []);
      setTotal(p.total || (Array.isArray(p) ? p.length : 0));
    } catch { message.error('Failed to load import B/Ls'); }
    finally { setLoading(false); }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchInvoices(); }, [fetchRecords, fetchInvoices]);

  const openDrawer = (bl?: ImportBl) => {
    setEditing(bl || null);
    form.resetFields();
    if (bl) {
      api.get(`/import-bls/${bl.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({
          ...rec,
          blDate: rec.blDate ? dayjs(rec.blDate) : null,
          arrivalDate: rec.arrivalDate ? dayjs(rec.arrivalDate) : null,
          deliveryOrderDate: rec.deliveryOrderDate ? dayjs(rec.deliveryOrderDate) : null,
        });
      });
    }
    setDrawerOpen(true);
  };

  const openDemurrage = async (bl: ImportBl) => {
    try {
      const { data } = await api.get(`/import-bls/${bl.id}/demurrage`);
      setDemurrageModal({ open: true, bl, info: data.data || data });
    } catch { message.error('Failed to calculate demurrage'); }
  };

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        ...values,
        blDate: values.blDate?.toISOString(),
        arrivalDate: values.arrivalDate?.toISOString(),
        deliveryOrderDate: values.deliveryOrderDate?.toISOString(),
      };
      if (editing) {
        await api.put(`/import-bls/${editing.id}`, body);
        message.success('Import B/L updated');
      } else {
        await api.post('/import-bls', body);
        message.success('Import B/L created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const doTransition = async (bl: ImportBl, nextStatus: string) => {
    try {
      await api.put(`/import-bls/${bl.id}/status`, { status: nextStatus });
      message.success('Status updated');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const doDelete = async (bl: ImportBl) => {
    try {
      await api.delete(`/import-bls/${bl.id}`);
      message.success('Deleted');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns: ColumnsType<ImportBl> = [
    { title: 'B/L Number', dataIndex: 'blNumber', key: 'blNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Invoice', dataIndex: ['invoice', 'invoiceNumber'], key: 'invoice' },
    { title: 'Shipping Line', dataIndex: 'shippingLine', key: 'shippingLine', render: (s) => s || '—' },
    { title: 'Vessel', dataIndex: 'vesselName', key: 'vesselName', render: (v) => v || '—' },
    { title: 'Arrival Date', dataIndex: 'arrivalDate', key: 'arrivalDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    {
      title: 'Free Days Left', key: 'freeDays',
      render: (_, bl) => {
        const remaining = getFreeDaysRemaining(bl.arrivalDate, bl.freeDays);
        const color = remaining <= 3 ? '#dc2626' : remaining <= 7 ? '#d97706' : '#374151';
        return <span style={{ color, fontWeight: remaining <= 3 ? 600 : 400 }}>{remaining}d</span>;
      },
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} />,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, bl) => {
        const transition = STATUS_TRANSITIONS[bl.status];
        return (
          <Space size="small">
            <Button size="small" intent="default" onClick={() => openDrawer(bl)}>Edit</Button>
            {transition && (
              <Popconfirm title={`${transition.label} for B/L "${bl.blNumber}"?`} onConfirm={() => doTransition(bl, transition.next)} okText={transition.label}>
                <Button size="small" intent="import">{transition.label}</Button>
              </Popconfirm>
            )}
            {bl.arrivalDate && bl.dailyDemurrageRate && (
              <Button size="small" intent="default" icon={<ClockCircleOutlined />} onClick={() => openDemurrage(bl)} aria-label="Demurrage">
                Demurrage
              </Button>
            )}
            <Popconfirm title="Delete this import B/L?" onConfirm={() => doDelete(bl)} okText="Delete" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const hasFilters = !!statusFilter;

  return (
    <>
      <PageHeader
        title="Import B/L"
        breadcrumbs={[{ label: 'Imports' }, { label: 'Import B/L' }]}
        actions={
          <Button intent="import" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Import B/L
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
              : <EmptyState type="no-data" title="No import B/Ls yet" description="Add a bill of lading once cargo is shipped." actionLabel="New Import B/L" onAction={() => openDrawer()} />,
          }}
        />
      </Card>

      {/* Create / Edit Drawer */}
      <Drawer
        title={editing ? `Edit B/L: ${editing.blNumber}` : 'New Import B/L'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
        footer={
          <Space style={{ float: 'right' }}>
            <Button intent="default" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button intent="import" loading={saving} onClick={() => form.submit()}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="Supplier Invoice" name="invoiceId" rules={[{ required: true, message: 'Select a supplier invoice' }]}>
            <Select
              showSearch
              placeholder="Select supplier invoice"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={invoices.map((inv) => ({ value: inv.id, label: inv.invoiceNumber }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="B/L Number" name="blNumber" rules={[{ required: true, message: 'Enter B/L number' }]}>
              <Input placeholder="e.g. MAEU1234567" />
            </Form.Item>
            <Form.Item label="B/L Date" name="blDate" rules={[{ required: true, message: 'Enter B/L date' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Shipping Line" name="shippingLine">
              <Input placeholder="e.g. Maersk" />
            </Form.Item>
            <Form.Item label="Vessel Name" name="vesselName">
              <Input placeholder="e.g. EVER GIVEN" />
            </Form.Item>
          </Space>

          <Form.Item label="Container Numbers (comma-separated)" name="containerNumbers">
            <Input placeholder="e.g. MSKU1234567, MSKU7654321" />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Port of Loading" name="portOfLoading">
              <Input placeholder="e.g. CNSHA" />
            </Form.Item>
            <Form.Item label="Port of Discharge" name="portOfDischarge">
              <Input placeholder="e.g. INNSA" />
            </Form.Item>
          </Space>

          <Form.Item label="Arrival Date" name="arrivalDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Free Days" name="freeDays" initialValue={14}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Daily Demurrage Rate (USD)" name="dailyDemurrageRate">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="e.g. 150" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Delivery Order Number" name="deliveryOrderNumber">
              <Input placeholder="D/O reference" />
            </Form.Item>
            <Form.Item label="Delivery Order Date" name="deliveryOrderDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Demurrage Modal */}
      <Modal
        title={`Demurrage — ${demurrageModal.bl?.blNumber || ''}`}
        open={demurrageModal.open}
        onCancel={() => setDemurrageModal({ open: false })}
        footer={<Button intent="default" onClick={() => setDemurrageModal({ open: false })}>Close</Button>}
      >
        {demurrageModal.info && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '8px 0' }}>
            <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: demurrageModal.info.freeDaysRemaining <= 3 ? '#dc2626' : '#16a34a' }}>
                {demurrageModal.info.freeDaysRemaining}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Free Days Remaining</div>
            </div>
            <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>
                {demurrageModal.info.billableDays}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Billable Days</div>
            </div>
            <div style={{ background: '#fef2f2', padding: 16, borderRadius: 8, textAlign: 'center', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#dc2626' }}>
                USD {Number(demurrageModal.info.estimatedCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Estimated Demurrage Charges</div>
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, gridColumn: '1 / -1' }}>
              Demurrage starts: {dayjs(demurrageModal.info.demurrageStartDate).format('DD MMM YYYY')}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}