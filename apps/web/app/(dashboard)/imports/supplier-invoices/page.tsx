'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Popconfirm, Descriptions, Tag, Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EditOutlined, MoreOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

interface SiLineItem { description: string; hsCode?: string; quantity: number; uomCode: string; unitPrice: number; totalPrice: number; }
interface SupplierInvoice {
  id: string; invoiceNumber: string; supplierPartyId: string; poId?: string;
  currency: string; exchangeRate: number; exchangeRateDate?: string;
  invoiceDate: string; dueDate?: string; totalAmount: number; status: string; notes?: string;
  supplier: { id: string; name: string; country: string };
  po?: { id: string; poNumber: string; status: string };
  lineItems?: SiLineItem[];
}
interface DocumentSet {
  id: string; invoiceNumber: string; status: string;
  supplier: { name: string };
  po?: { poNumber: string; status: string };
  lineItems: SiLineItem[];
  billsOfEntry: { id: string; boeNumber?: string; status: string; assessedValue: number; totalDuty: number }[];
  importBls: { id: string; blNumber: string; status: string; arrivalDate?: string }[];
  landedCosts?: { id: string; totalLandedCost: number; costPerUnit: number }[];
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CLEARED', label: 'Cleared' },
];
const UOM_OPTIONS = ['PCS', 'KG', 'MT', 'LTR', 'M', 'M2', 'M3', 'SET', 'PAIR'].map((u) => ({ value: u, label: u }));
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AED', 'INR'].map((c) => ({ value: c, label: c }));
const DEFAULT_LINE: SiLineItem = { description: '', hsCode: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, totalPrice: 0 };

export default function SupplierInvoicesPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<SupplierInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [lineItems, setLineItems] = useState<SiLineItem[]>([{ ...DEFAULT_LINE }]);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [approvedPos, setApprovedPos] = useState<{ id: string; poNumber: string; supplierPartyId: string }[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [docSetOpen, setDocSetOpen] = useState(false);
  const [docSet, setDocSet] = useState<DocumentSet | null>(null);
  const [docSetLoading, setDocSetLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchParties = useCallback(async () => {
    try {
      const { data } = await api.get('/parties', { params: { type: 'VENDOR', limit: 200 } });
      const p = data.data || data; setParties(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchApprovedPos = useCallback(async () => {
    try {
      const { data } = await api.get('/supplier-pos', { params: { status: 'APPROVED', limit: 200 } });
      const p = data.data || data; setApprovedPos(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/supplier-invoices', { params });
      const p = data.data || data;
      setRecords(Array.isArray(p) ? p : p.data || []);
      setTotal(p.total || (Array.isArray(p) ? p.length : 0));
    } catch { message.error('Failed to load supplier invoices'); }
    finally { setLoading(false); }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); fetchApprovedPos(); }, [fetchRecords, fetchParties, fetchApprovedPos]);

  const openDrawer = (inv?: SupplierInvoice) => {
    setEditing(inv || null);
    form.resetFields();
    setLineItems([{ ...DEFAULT_LINE }]);
    setSelectedSupplierId('');
    if (inv) {
      api.get(`/supplier-invoices/${inv.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({
          ...rec,
          invoiceDate: rec.invoiceDate ? dayjs(rec.invoiceDate) : null,
          dueDate: rec.dueDate ? dayjs(rec.dueDate) : null,
          exchangeRateDate: rec.exchangeRateDate ? dayjs(rec.exchangeRateDate) : null,
        });
        setSelectedSupplierId(rec.supplierPartyId || '');
        if (rec.lineItems?.length) setLineItems(rec.lineItems);
      });
    }
    setDrawerOpen(true);
  };

  const openDocSet = async (inv: SupplierInvoice) => {
    setDocSetOpen(true);
    setDocSet(null);
    setDocSetLoading(true);
    try {
      const { data } = await api.get(`/supplier-invoices/${inv.id}/document-set`);
      setDocSet(data.data || data);
    } catch { message.error('Failed to load document set'); }
    finally { setDocSetLoading(false); }
  };

  const updateLine = (i: number, field: keyof SiLineItem, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      const qty = Number(field === 'quantity' ? value : next[i].quantity);
      const price = Number(field === 'unitPrice' ? value : next[i].unitPrice);
      next[i].totalPrice = qty * price;
      return next;
    });
  };

  const totalAmount = lineItems.reduce((s, l) => s + Number(l.totalPrice || 0), 0);

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        ...values,
        invoiceDate: values.invoiceDate?.toISOString(),
        dueDate: values.dueDate?.toISOString(),
        exchangeRateDate: values.exchangeRateDate?.toISOString(),
        lineItems: lineItems.map(({ totalPrice: _, ...l }) => l),
      };
      if (editing) {
        await api.put(`/supplier-invoices/${editing.id}`, body);
        message.success('Supplier invoice updated');
      } else {
        await api.post('/supplier-invoices', body);
        message.success('Supplier invoice created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const doAction = async (action: string, inv: SupplierInvoice) => {
    try {
      if (action === 'receive') await api.put(`/supplier-invoices/${inv.id}/receive`);
      else if (action === 'delete') await api.delete(`/supplier-invoices/${inv.id}`);
      message.success(action === 'delete' ? 'Deleted' : 'Marked as received');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const filteredPos = approvedPos.filter((po) => !selectedSupplierId || po.supplierPartyId === selectedSupplierId);

  const columns: ColumnsType<SupplierInvoice> = [
    { title: 'Invoice No', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Supplier', dataIndex: ['supplier', 'name'], key: 'supplier' },
    { title: 'PO No', dataIndex: ['po', 'poNumber'], key: 'poNumber', render: (n) => n || '—' },
    { title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center' },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} />,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, inv) => (
        <Space size="small">
          {inv.status === 'DRAFT' && (
            <Button size="small" intent="default" icon={<EditOutlined />} aria-label="Edit" onClick={() => openDrawer(inv)} />
          )}
          {inv.status === 'DRAFT' && (
            <Popconfirm title={`Mark "${inv.invoiceNumber}" as received?`} onConfirm={() => doAction('receive', inv)} okText="Mark Received">
              <Button size="small" intent="default">Mark Received</Button>
            </Popconfirm>
          )}
          <Button size="small" intent="default" icon={<FileTextOutlined />} aria-label="Document set" onClick={() => openDocSet(inv)} />
          {inv.status === 'DRAFT' && (
            <Popconfirm title="Delete this supplier invoice?" onConfirm={() => doAction('delete', inv)} okText="Delete" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
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
        title="Supplier Invoices"
        breadcrumbs={[{ label: 'Imports' }, { label: 'Supplier Invoices' }]}
        actions={
          <Button intent="import" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Supplier Invoice
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
              : <EmptyState type="no-data" title="No supplier invoices yet" description="Create your first supplier invoice to get started." actionLabel="New Supplier Invoice" onAction={() => openDrawer()} />,
          }}
        />
      </Card>

      {/* Create / Edit Drawer */}
      <Drawer
        title={editing ? `Edit: ${editing.invoiceNumber}` : 'New Supplier Invoice'}
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
          <Form.Item label="Supplier" name="supplierPartyId" rules={[{ required: true, message: 'Select a supplier' }]}>
            <Select
              showSearch
              placeholder="Select supplier"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={parties.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => { setSelectedSupplierId(v); form.setFieldValue('poId', undefined); }}
            />
          </Form.Item>

          <Form.Item label="Linked PO (optional)" name="poId">
            <Select
              showSearch
              allowClear
              placeholder="Select approved PO"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={filteredPos.map((po) => ({ value: po.id, label: po.poNumber }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Currency" name="currency" initialValue="USD">
              <Select options={CURRENCIES} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Exchange Rate (to INR)" name="exchangeRate" rules={[{ required: true, message: 'Enter exchange rate' }]}>
              <InputNumber min={0} precision={6} style={{ width: '100%' }} placeholder="e.g. 83.5" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Invoice Date" name="invoiceDate" rules={[{ required: true, message: 'Enter invoice date' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Due Date" name="dueDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          {/* Line Items */}
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Line Items</div>
          <Table
            dataSource={lineItems}
            rowKey={(_, i) => String(i)}
            pagination={false}
            size="small"
            scroll={{ x: 600 }}
            columns={[
              {
                title: 'Description *', key: 'desc', width: 160,
                render: (_, r, i) => <Input value={r.description} placeholder="Item description" onChange={(e) => updateLine(i, 'description', e.target.value)} />,
              },
              {
                title: 'HS Code', key: 'hs', width: 90,
                render: (_, r, i) => <Input value={r.hsCode} placeholder="6–8 digit" onChange={(e) => updateLine(i, 'hsCode', e.target.value)} />,
              },
              {
                title: 'Qty *', key: 'qty', width: 70,
                render: (_, r, i) => <InputNumber min={0} precision={3} value={r.quantity} onChange={(v) => updateLine(i, 'quantity', v ?? 0)} style={{ width: '100%' }} />,
              },
              {
                title: 'UOM', key: 'uom', width: 80,
                render: (_, r, i) => <Select value={r.uomCode} options={UOM_OPTIONS} onChange={(v) => updateLine(i, 'uomCode', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'Unit Price *', key: 'price', width: 100,
                render: (_, r, i) => <InputNumber min={0} precision={4} value={r.unitPrice} onChange={(v) => updateLine(i, 'unitPrice', v ?? 0)} style={{ width: '100%' }} />,
              },
              {
                title: 'Total', key: 'total', width: 90, align: 'right' as const,
                render: (_, r) => Number(r.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
              },
              {
                title: '', key: 'del', width: 40,
                render: (_, __, i) => (
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setLineItems((p) => p.filter((_, j) => j !== i))} aria-label="Remove line" />
                ),
              },
            ]}
            footer={() => (
              <Space>
                <Button size="small" intent="default" icon={<PlusOutlined />} onClick={() => setLineItems((p) => [...p, { ...DEFAULT_LINE }])}>Add Line</Button>
                <span style={{ marginLeft: 16, fontWeight: 600 }}>
                  Total: {form.getFieldValue('currency') || 'USD'} {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </Space>
            )}
          />
        </Form>
      </Drawer>

      {/* Document Set Drawer (960px) */}
      <Drawer
        title={docSet ? `Document Set: ${docSet.invoiceNumber}` : 'Document Set'}
        open={docSetOpen}
        onClose={() => setDocSetOpen(false)}
        width={960}
        footer={
          <Space style={{ float: 'right' }}>
            <Button intent="default" onClick={() => setDocSetOpen(false)}>Close</Button>
          </Space>
        }
      >
        {docSetLoading && <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Loading document set…</div>}
        {!docSetLoading && docSet && (
          <>
            {/* Invoice summary */}
            <Descriptions title="Supplier Invoice" bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Invoice No">{docSet.invoiceNumber}</Descriptions.Item>
              <Descriptions.Item label="Supplier">{docSet.supplier?.name}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={docSet.status.toLowerCase() as DocumentStatusType} />
              </Descriptions.Item>
              <Descriptions.Item label="Line Items">{docSet.lineItems?.length ?? 0}</Descriptions.Item>
            </Descriptions>

            {/* Linked PO */}
            {docSet.po && (
              <>
                <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, fontWeight: 600 }}>Purchase Order</Divider>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="PO Number">{docSet.po.poNumber}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <StatusBadge status={docSet.po.status.toLowerCase() as DocumentStatusType} />
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {/* Bills of Entry */}
            <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, fontWeight: 600 }}>Bills of Entry</Divider>
            {docSet.billsOfEntry?.length ? (
              <Table
                dataSource={docSet.billsOfEntry}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginBottom: 24 }}
                columns={[
                  { title: 'BoE Number', dataIndex: 'boeNumber', render: (n) => n || '—' },
                  { title: 'Assessed Value (INR)', dataIndex: 'assessedValue', align: 'right', render: (v) => `₹${Number(v).toLocaleString('en-IN')}` },
                  { title: 'Total Duty (INR)', dataIndex: 'totalDuty', align: 'right', render: (v) => `₹${Number(v).toLocaleString('en-IN')}` },
                  { title: 'Status', dataIndex: 'status', render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} /> },
                ]}
              />
            ) : (
              <div style={{ marginBottom: 24, color: '#9ca3af', fontSize: 13 }}>No bills of entry linked</div>
            )}

            {/* Import B/Ls */}
            <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, fontWeight: 600 }}>Import Bills of Lading</Divider>
            {docSet.importBls?.length ? (
              <Table
                dataSource={docSet.importBls}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginBottom: 24 }}
                columns={[
                  { title: 'B/L Number', dataIndex: 'blNumber' },
                  { title: 'Arrival Date', dataIndex: 'arrivalDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
                  { title: 'Status', dataIndex: 'status', render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} /> },
                ]}
              />
            ) : (
              <div style={{ marginBottom: 24, color: '#9ca3af', fontSize: 13 }}>No import B/Ls linked</div>
            )}

            {/* Landed Costs */}
            <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, fontWeight: 600 }}>Landed Costs</Divider>
            {docSet.landedCosts?.length ? (
              <Table
                dataSource={docSet.landedCosts}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Total Landed Cost (INR)', dataIndex: 'totalLandedCost', align: 'right', render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                  { title: 'Cost per Unit (INR)', dataIndex: 'costPerUnit', align: 'right', render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 4 })}` },
                ]}
              />
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>No landed costs recorded</div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}