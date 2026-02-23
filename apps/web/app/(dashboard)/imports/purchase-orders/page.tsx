'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Popconfirm, Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EditOutlined, MoreOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

interface PoLineItem { description: string; hsCode?: string; quantity: number; uomCode: string; unitPrice: number; totalPrice: number; }
interface SupplierPo {
  id: string; poNumber: string; supplierPartyId: string; currency: string;
  expectedDeliveryDate?: string; status: string; totalAmount: number; notes?: string;
  supplier: { id: string; name: string; country: string };
  lineItems?: PoLineItem[];
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
  { value: 'FULLY_FULFILLED', label: 'Fully Fulfilled' },
  { value: 'CLOSED', label: 'Closed' },
];

const UOM_OPTIONS = ['PCS', 'KG', 'MT', 'LTR', 'M', 'M2', 'M3', 'SET', 'PAIR'].map((u) => ({ value: u, label: u }));
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AED', 'INR'].map((c) => ({ value: c, label: c }));

const DEFAULT_LINE: PoLineItem = { description: '', hsCode: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, totalPrice: 0 };

export default function PurchaseOrdersPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<SupplierPo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierPo | null>(null);
  const [saving, setSaving] = useState(false);
  const [lineItems, setLineItems] = useState<PoLineItem[]>([{ ...DEFAULT_LINE }]);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [form] = Form.useForm();

  const fetchParties = useCallback(async () => {
    try {
      const { data } = await api.get('/parties', { params: { type: 'VENDOR', limit: 200 } });
      const p = data.data || data; setParties(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/supplier-pos', { params });
      const p = data.data || data;
      setRecords(Array.isArray(p) ? p : p.data || []);
      setTotal(p.total || (Array.isArray(p) ? p.length : 0));
    } catch { message.error('Failed to load purchase orders'); }
    finally { setLoading(false); }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const openDrawer = (po?: SupplierPo) => {
    setEditing(po || null);
    form.resetFields();
    setLineItems([{ ...DEFAULT_LINE }]);
    if (po) {
      api.get(`/supplier-pos/${po.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({
          ...rec,
          expectedDeliveryDate: rec.expectedDeliveryDate ? dayjs(rec.expectedDeliveryDate) : null,
        });
        if (rec.lineItems?.length) setLineItems(rec.lineItems);
      });
    }
    setDrawerOpen(true);
  };

  const updateLine = (i: number, field: keyof PoLineItem, value: any) => {
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
        expectedDeliveryDate: values.expectedDeliveryDate?.toISOString(),
        lineItems: lineItems.map(({ totalPrice: _, ...l }) => l),
      };
      if (editing) {
        await api.put(`/supplier-pos/${editing.id}`, body);
        message.success('Purchase order updated');
      } else {
        await api.post('/supplier-pos', body);
        message.success('Purchase order created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const doAction = async (action: string, po: SupplierPo) => {
    try {
      if (action === 'submit') await api.put(`/supplier-pos/${po.id}/submit`);
      else if (action === 'approve') await api.put(`/supplier-pos/${po.id}/approve`);
      else if (action === 'reject') await api.put(`/supplier-pos/${po.id}/reject`);
      else if (action === 'clone') await api.post(`/supplier-pos/${po.id}/clone`);
      else if (action === 'delete') await api.delete(`/supplier-pos/${po.id}`);
      message.success(action === 'delete' ? 'Deleted' : 'Done');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const getMenuItems = (po: SupplierPo) => {
    const items: any[] = [];
    if (po.status === 'DRAFT') {
      items.push({ key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => openDrawer(po) });
      items.push({
        key: 'submit', label: (
          <Popconfirm title={`Submit "${po.poNumber}" for approval?`} onConfirm={() => doAction('submit', po)} okText="Submit">
            <span>Submit for Approval</span>
          </Popconfirm>
        ),
      });
    }
    if (po.status === 'PENDING_APPROVAL') {
      items.push({
        key: 'approve', label: (
          <Popconfirm title={`Approve "${po.poNumber}"?`} onConfirm={() => doAction('approve', po)} okText="Approve" okButtonProps={{ style: { background: '#16a34a' } }}>
            <span>Approve</span>
          </Popconfirm>
        ),
      });
      items.push({
        key: 'reject', label: (
          <Popconfirm title={`Reject "${po.poNumber}"?`} onConfirm={() => doAction('reject', po)} okText="Reject" okButtonProps={{ danger: true }}>
            <span style={{ color: '#dc2626' }}>Reject</span>
          </Popconfirm>
        ),
      });
    }
    items.push({ key: 'clone', label: 'Clone', icon: <CopyOutlined />, onClick: () => doAction('clone', po) });
    if (po.status === 'DRAFT') {
      items.push({
        key: 'delete', label: (
          <Popconfirm title="Delete this purchase order?" onConfirm={() => doAction('delete', po)} okText="Delete" okButtonProps={{ danger: true }}>
            <span style={{ color: '#dc2626' }}>Delete</span>
          </Popconfirm>
        ),
      });
    }
    return items;
  };

  const columns: ColumnsType<SupplierPo> = [
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Supplier', dataIndex: ['supplier', 'name'], key: 'supplier' },
    { title: 'Exp. Delivery', dataIndex: 'expectedDeliveryDate', key: 'expectedDeliveryDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center' },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} />,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, po) => (
        <Dropdown menu={{ items: getMenuItems(po) }} trigger={['click']}>
          <Button size="small" intent="default" icon={<MoreOutlined />} aria-label="Actions" />
        </Dropdown>
      ),
    },
  ];

  const hasFilters = !!statusFilter;

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        breadcrumbs={[{ label: 'Imports' }, { label: 'Purchase Orders' }]}
        actions={
          <Button intent="import" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Purchase Order
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
              : <EmptyState type="no-data" title="No purchase orders yet" description="Create your first supplier purchase order to get started." actionLabel="New Purchase Order" onAction={() => openDrawer()} />,
          }}
        />
      </Card>

      <Drawer
        title={editing ? `Edit: ${editing.poNumber}` : 'New Purchase Order'}
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
            />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Currency" name="currency" initialValue="USD">
              <Select options={CURRENCIES} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Expected Delivery" name="expectedDeliveryDate">
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
                title: 'Total', key: 'total', width: 90, align: 'right',
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
    </>
  );
}