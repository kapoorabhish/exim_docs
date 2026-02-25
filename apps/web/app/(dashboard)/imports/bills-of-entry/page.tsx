'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  InputNumber, Popconfirm, Descriptions, Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

interface BillOfEntry {
  id: string; boeNumber?: string; invoiceId: string; portOfEntry?: string;
  assessedValue: number; basicDuty: number; socialWelfareSurcharge: number;
  igst: number; compensationCess: number; totalDuty: number;
  status: string; filingDate?: string; outOfChargeDate?: string; notes?: string;
  invoice: { id: string; invoiceNumber: string; supplier?: { name: string } };
}

interface DutyPreview { bcd: number; sws: number; igst: number; compensationCess: number; totalDuty: number; }

function calculateDutyPreview(cif: number, bcdRate: number, igstRate: number, cessRate: number): DutyPreview {
  const bcd = cif * bcdRate;
  const sws = bcd * 0.1;
  const igstBase = cif + bcd + sws;
  const igst = igstBase * igstRate;
  const compensationCess = cif * cessRate;
  return { bcd, sws, igst, compensationCess, totalDuty: bcd + sws + igst + compensationCess };
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'FILED', label: 'Filed' },
  { value: 'EXAMINED', label: 'Examined' },
  { value: 'OUT_OF_CHARGE', label: 'Out of Charge' },
  { value: 'DUTY_PAID', label: 'Duty Paid' },
];

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }> = {
  DRAFT: { label: 'File BoE', next: 'FILED' },
  FILED: { label: 'Mark Examined', next: 'EXAMINED' },
  EXAMINED: { label: 'Out of Charge', next: 'OUT_OF_CHARGE' },
  OUT_OF_CHARGE: { label: 'Mark Duty Paid', next: 'DUTY_PAID' },
};

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function BillsOfEntryPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<BillOfEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BillOfEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string }[]>([]);
  const [form] = Form.useForm();
  const [dutyPreview, setDutyPreview] = useState<DutyPreview>({ bcd: 0, sws: 0, igst: 0, compensationCess: 0, totalDuty: 0 });

  const [siView, setSiView] = useState<{ open: boolean; loading: boolean; data: any }>({ open: false, loading: false, data: null });

  // Landed cost drawer
  const [lcDrawerOpen, setLcDrawerOpen] = useState(false);
  const [lcForBoe, setLcForBoe] = useState<BillOfEntry | null>(null);
  const [lcSaving, setLcSaving] = useState(false);
  const [lcForm] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    try {
      const { data } = await api.get('/supplier-invoices', { params: { limit: 200 } });
      const p = data.data || data; setInvoices(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const openSiView = async (invoiceId: string) => {
    setSiView({ open: true, loading: true, data: null });
    try {
      const { data } = await api.get(`/supplier-invoices/${invoiceId}`);
      setSiView({ open: true, loading: false, data: data.data || data });
    } catch {
      message.error('Failed to load supplier invoice details');
      setSiView({ open: false, loading: false, data: null });
    }
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/bills-of-entry', { params });
      const p = data.data || data;
      setRecords(Array.isArray(p) ? p : p.data || []);
      setTotal(p.total || (Array.isArray(p) ? p.length : 0));
    } catch { message.error('Failed to load bills of entry'); }
    finally { setLoading(false); }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchInvoices(); }, [fetchRecords, fetchInvoices]);

  const recalcPreview = () => {
    const cif = form.getFieldValue('assessedValue') || 0;
    const bcdRate = (form.getFieldValue('bcdRate') || 0) / 100;
    const igstRate = (form.getFieldValue('igstRate') || 0) / 100;
    const cessRate = (form.getFieldValue('compensationCessRate') || 0) / 100;
    setDutyPreview(calculateDutyPreview(cif, bcdRate, igstRate, cessRate));
  };

  const openDrawer = (boe?: BillOfEntry) => {
    setEditing(boe || null);
    form.resetFields();
    setDutyPreview({ bcd: 0, sws: 0, igst: 0, compensationCess: 0, totalDuty: 0 });
    if (boe) {
      api.get(`/bills-of-entry/${boe.id}`).then(({ data }) => {
        const rec = data.data || data;
        const bcdRate = rec.assessedValue > 0 ? ((rec.basicDuty / rec.assessedValue) * 100) : 10;
        form.setFieldsValue({ ...rec, bcdRate: Number(bcdRate.toFixed(2)), igstRate: 18, compensationCessRate: 0 });
        recalcPreview();
      });
    }
    setDrawerOpen(true);
  };

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        invoiceId: values.invoiceId,
        portOfEntry: values.portOfEntry,
        assessedValue: values.assessedValue,
        bcdRate: values.bcdRate / 100,
        igstRate: values.igstRate / 100,
        compensationCessRate: (values.compensationCessRate || 0) / 100,
        notes: values.notes,
      };
      if (editing) {
        await api.put(`/bills-of-entry/${editing.id}`, body);
        message.success('Bill of entry updated');
      } else {
        await api.post('/bills-of-entry', body);
        message.success('Bill of entry created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const doTransition = async (boe: BillOfEntry, nextStatus: string) => {
    try {
      await api.put(`/bills-of-entry/${boe.id}/status`, { status: nextStatus });
      message.success('Status updated');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const doDelete = async (boe: BillOfEntry) => {
    try {
      await api.delete(`/bills-of-entry/${boe.id}`);
      message.success('Deleted');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const onSaveLandedCost = async (values: any) => {
    if (!lcForBoe) return;
    setLcSaving(true);
    try {
      await api.post('/landed-costs', { ...values, boeId: lcForBoe.id });
      message.success('Landed cost recorded');
      setLcDrawerOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save landed cost');
    } finally { setLcSaving(false); }
  };

  const columns: ColumnsType<BillOfEntry> = [
    { title: 'BoE Number', dataIndex: 'boeNumber', key: 'boeNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n || '—'}</span> },
    {
      title: 'Supplier Invoice', key: 'invoice',
      render: (_, boe) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openSiView(boe.invoice.id)}>
          {boe.invoice?.invoiceNumber}
        </Button>
      ),
    },
    { title: 'Port of Entry', dataIndex: 'portOfEntry', key: 'portOfEntry', render: (p) => p || '—' },
    {
      title: 'CIF Value (INR)', dataIndex: 'assessedValue', key: 'assessedValue', align: 'right',
      render: (v) => `₹${fmt(Number(v))}`,
    },
    {
      title: 'Total Duty (INR)', dataIndex: 'totalDuty', key: 'totalDuty', align: 'right',
      render: (v) => `₹${fmt(Number(v))}`,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} />,
    },
    { title: 'OOC Date', dataIndex: 'outOfChargeDate', key: 'outOfChargeDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_, boe) => {
        const transition = STATUS_TRANSITIONS[boe.status];
        return (
          <Space size="small">
            {boe.status === 'DRAFT' && (
              <Button size="small" intent="default" onClick={() => openDrawer(boe)}>Edit</Button>
            )}
            {transition && (
              <Popconfirm
                title={`${transition.label} — "${boe.boeNumber || boe.id.slice(0, 8)}"?`}
                onConfirm={() => doTransition(boe, transition.next)}
                okText={transition.label}
              >
                <Button size="small" intent="import">{transition.label}</Button>
              </Popconfirm>
            )}
            <Button size="small" intent="default" onClick={() => { setLcForBoe(boe); lcForm.resetFields(); setLcDrawerOpen(true); }}>
              Landed Cost
            </Button>
            {boe.status === 'DRAFT' && (
              <Popconfirm title="Delete this bill of entry?" onConfirm={() => doDelete(boe)} okText="Delete" okButtonProps={{ danger: true }}>
                <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const hasFilters = !!statusFilter;

  return (
    <>
      <PageHeader
        title="Bills of Entry"
        breadcrumbs={[{ label: 'Imports' }, { label: 'Bills of Entry' }]}
        actions={
          <Button intent="import" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Bill of Entry
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
              : <EmptyState type="no-data" title="No bills of entry yet" description="Create a bill of entry once a supplier invoice is received." actionLabel="New Bill of Entry" onAction={() => openDrawer()} />,
          }}
        />
      </Card>

      {/* Create / Edit Drawer */}
      <Drawer
        title={editing ? `Edit BoE: ${editing.boeNumber || '—'}` : 'New Bill of Entry'}
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
        <Form form={form} layout="vertical" onFinish={onSave} onValuesChange={recalcPreview}>
          <Form.Item label="Supplier Invoice" name="invoiceId" rules={[{ required: true, message: 'Select a supplier invoice' }]}>
            <Select
              showSearch
              placeholder="Select supplier invoice"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={invoices.map((inv) => ({ value: inv.id, label: inv.invoiceNumber }))}
            />
          </Form.Item>

          <Form.Item label="Port of Entry" name="portOfEntry">
            <Input placeholder="e.g. INNSA (Nhava Sheva)" />
          </Form.Item>

          <Form.Item label="Assessed CIF Value (INR)" name="assessedValue" rules={[{ required: true, message: 'Enter CIF value in INR' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="e.g. 500000" />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="BCD Rate %" name="bcdRate" initialValue={10} rules={[{ required: true }]}>
              <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="IGST Rate %" name="igstRate" initialValue={18} rules={[{ required: true }]}>
              <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Comp. Cess Rate %" name="compensationCessRate" initialValue={0}>
              <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          {/* Live duty preview */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#374151' }}>Duty Preview</div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="BCD">₹{fmt(dutyPreview.bcd)}</Descriptions.Item>
              <Descriptions.Item label="SWS (10% of BCD)">₹{fmt(dutyPreview.sws)}</Descriptions.Item>
              <Descriptions.Item label="IGST">₹{fmt(dutyPreview.igst)}</Descriptions.Item>
              <Descriptions.Item label="Comp. Cess">₹{fmt(dutyPreview.compensationCess)}</Descriptions.Item>
              <Descriptions.Item label={<strong>Total Duty</strong>} span={2}>
                <strong>₹{fmt(dutyPreview.totalDuty)}</strong>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Supplier Invoice Quick-View Drawer */}
      <Drawer
        title={siView.data?.invoiceNumber || 'Supplier Invoice Details'}
        open={siView.open}
        onClose={() => setSiView(v => ({ ...v, open: false }))}
        width={640}
        footer={<div style={{ textAlign: 'right' }}><Button intent="default" onClick={() => setSiView(v => ({ ...v, open: false }))}>Close</Button></div>}
      >
        {siView.loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : siView.data ? (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Invoice No">{siView.data.invoiceNumber}</Descriptions.Item>
            <Descriptions.Item label="Supplier">{siView.data.supplier?.name}</Descriptions.Item>
            <Descriptions.Item label="Invoice Date">{siView.data.invoiceDate ? dayjs(siView.data.invoiceDate).format('DD MMM YYYY') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Due Date">{siView.data.dueDate ? dayjs(siView.data.dueDate).format('DD MMM YYYY') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Currency">{siView.data.currency}</Descriptions.Item>
            <Descriptions.Item label="Total Amount">
              {siView.data.currency} {Number(siView.data.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusBadge status={siView.data.status?.toLowerCase() as DocumentStatusType} />
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      {/* Landed Cost Drawer */}
      <Drawer
        title={`Landed Cost — ${lcForBoe?.boeNumber || (lcForBoe ? lcForBoe.id.slice(0, 8) : '')}`}
        open={lcDrawerOpen}
        onClose={() => setLcDrawerOpen(false)}
        width={640}
        footer={
          <Space style={{ float: 'right' }}>
            <Button intent="default" onClick={() => setLcDrawerOpen(false)}>Cancel</Button>
            <Button intent="import" loading={lcSaving} onClick={() => lcForm.submit()}>Save Landed Cost</Button>
          </Space>
        }
      >
        <Form form={lcForm} layout="vertical" onFinish={onSaveLandedCost}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="CIF Value (INR)" name="cifValue" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Customs Duty (INR)" name="customsDuty" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Clearing Charges" name="clearingCharges" initialValue={0}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Handling Charges" name="handlingCharges" initialValue={0}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Transport Charges" name="transportCharges" initialValue={0}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Other Charges" name="otherCharges" initialValue={0}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item label="Total Quantity (for per-unit cost)" name="totalQuantity" rules={[{ required: true }]}>
            <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}