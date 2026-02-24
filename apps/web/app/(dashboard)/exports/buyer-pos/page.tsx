'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Divider, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
  CloseOutlined, CopyOutlined, MoreOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import { useDebounce } from '../../../../lib/use-debounce';
import api from '../../../../lib/api';

interface BuyerPo {
  id: string;
  poNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  poDate: string;
  deliveryDate?: string;
  buyerPartyId: string;
  buyer: { name: string };
  currency: string;
  totalAmount: number;
  notes?: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'CHF', 'CNY', 'AED'];
const STATUS_OPTIONS = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

function toLower(s: string) { return s.toLowerCase() as any; }

export default function BuyerPosPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<BuyerPo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerPo | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<any[]>([{ lineNumber: 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 }]);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);

  const fetchParties = useCallback(async () => {
    try {
      const { data } = await api.get('/parties', { params: { pageSize: 200, type: 'CUSTOMER' } });
      const p = data.data || data;
      setParties(p.data || p);
    } catch {
      // non-critical
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (debouncedSearch) params.q = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/buyer-pos', { params });
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
      setTotal(payload.total || 0);
    } catch {
      message.error('Failed to load buyer purchase orders');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const openDrawer = (po?: BuyerPo) => {
    setEditing(po || null);
    form.resetFields();
    setLineItems([{ lineNumber: 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 }]);
    if (po) {
      api.get(`/buyer-pos/${po.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({
          ...rec,
          poDate: rec.poDate ? dayjs(rec.poDate) : null,
          deliveryDate: rec.deliveryDate ? dayjs(rec.deliveryDate) : null,
        });
        if (rec.lineItems?.length) setLineItems(rec.lineItems);
      }).catch(() => message.error('Failed to load PO'));
    }
    setDrawerOpen(true);
  };

  const calcLine = (li: any) => ({ ...li, amount: Number(li.quantity || 0) * Number(li.unitPrice || 0) });

  const updateLine = (index: number, field: string, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = calcLine({ ...next[index], [field]: value });
      return next;
    });
  };

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        ...values,
        poDate: values.poDate?.toISOString(),
        deliveryDate: values.deliveryDate?.toISOString() ?? null,
        lineItems,
      };
      if (editing) {
        await api.put(`/buyer-pos/${editing.id}`, body);
        message.success('Buyer PO updated');
      } else {
        await api.post('/buyer-pos', body);
        message.success('Buyer PO created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (action: string, id: string) => {
    try {
      if (action === 'confirm') await api.put(`/buyer-pos/${id}/status`, { status: 'CONFIRMED' });
      else if (action === 'ship') await api.put(`/buyer-pos/${id}/status`, { status: 'SHIPPED' });
      else if (action === 'complete') await api.put(`/buyer-pos/${id}/status`, { status: 'COMPLETED' });
      else if (action === 'cancel') await api.put(`/buyer-pos/${id}/status`, { status: 'CANCELLED' });
      else if (action === 'clone') await api.post(`/buyer-pos/${id}/clone`);
      else if (action === 'delete') await api.delete(`/buyer-pos/${id}`);
      message.success('Done');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const subtotal = lineItems.reduce((s, i) => s + Number(i.amount || 0), 0);

  const columns: ColumnsType<BuyerPo> = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    { title: 'Buyer', dataIndex: ['buyer', 'name'], key: 'buyer' },
    { title: 'PO Date', dataIndex: 'poDate', key: 'poDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Delivery Date', dataIndex: 'deliveryDate', key: 'deliveryDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80 },
    {
      title: 'Total Amount',
      key: 'amount',
      align: 'right',
      render: (_, r) => `${r.currency} ${Number(r.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={toLower(s)} /> },
    {
      title: '',
      key: 'actions',
      render: (_, r) => {
        const items: any[] = [];
        if (r.status === 'DRAFT') {
          items.push({ key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => openDrawer(r) });
          items.push({
            key: 'confirm', label: 'Confirm PO', icon: <CheckOutlined />,
            onClick: () => doAction('confirm', r.id),
          });
          items.push({ type: 'divider' });
        }
        if (r.status === 'CONFIRMED') {
          items.push({
            key: 'ship', label: 'Mark as Shipped', icon: <CheckOutlined />,
            onClick: () => doAction('ship', r.id),
          });
        }
        if (r.status === 'SHIPPED') {
          items.push({
            key: 'complete', label: 'Mark Completed', icon: <CheckOutlined />,
            onClick: () => doAction('complete', r.id),
          });
        }
        items.push({ key: 'clone', label: 'Clone as Draft', icon: <CopyOutlined />, onClick: () => doAction('clone', r.id) });
        if (['DRAFT', 'CONFIRMED'].includes(r.status)) {
          items.push({ type: 'divider' });
          items.push({ key: 'cancel', label: 'Cancel PO', icon: <CloseOutlined />, danger: true, onClick: () => doAction('cancel', r.id) });
        }
        if (r.status === 'DRAFT') {
          items.push({ key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => doAction('delete', r.id) });
        }
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} aria-label="Actions" intent="default" />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Buyer Purchase Orders"
        breadcrumbs={[{ label: 'Exports' }, { label: 'Buyer POs' }]}
        actions={
          <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Buyer PO
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by PO number, buyer..."
            allowClear
            style={{ width: 280 }}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 180 }}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
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
                type={debouncedSearch || statusFilter ? 'no-results' : 'no-data'}
                title={debouncedSearch || statusFilter ? 'No matching POs' : 'No buyer purchase orders'}
                description={
                  debouncedSearch || statusFilter
                    ? 'Try clearing the search or filter.'
                    : 'Add a buyer PO when you receive an order from a customer.'
                }
                actionLabel={debouncedSearch || statusFilter ? undefined : 'New Buyer PO'}
                onAction={debouncedSearch || statusFilter ? undefined : () => openDrawer()}
              />
            ),
          }}
        />
      </Card>

      <Drawer
        title={editing ? `Edit PO: ${editing.poNumber}` : 'New Buyer Purchase Order'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={760}
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
          <Divider orientation="left" orientationMargin={0}>Order Details</Divider>
          <Form.Item label="Buyer" name="buyerPartyId" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select buyer"
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={parties.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="PO Date" name="poDate" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Delivery Date" name="deliveryDate" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Currency" name="currency" initialValue="USD" style={{ flex: 1 }}>
              <Select options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Shipping</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Incoterm" name="incoterm" style={{ flex: 1 }}>
              <Input placeholder="e.g. FOB" />
            </Form.Item>
            <Form.Item label="Port of Loading" name="portOfLoading" style={{ flex: 1 }}>
              <Input placeholder="e.g. INMAA" />
            </Form.Item>
            <Form.Item label="Payment Terms" name="paymentTerms" style={{ flex: 1 }}>
              <Input placeholder="e.g. T/T 30 days" />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Line Items</Divider>
          <Table
            dataSource={lineItems}
            rowKey={(_, i) => String(i)}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Description', key: 'desc',
                render: (_, r, i) => <Input value={r.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="Product / description" />,
              },
              {
                title: 'HS Code', key: 'hs', width: 100,
                render: (_, r, i) => <Input value={r.hsCode} onChange={(e) => updateLine(i, 'hsCode', e.target.value)} />,
              },
              {
                title: 'Qty', key: 'qty', width: 80,
                render: (_, r, i) => <InputNumber min={0} value={r.quantity} onChange={(v) => updateLine(i, 'quantity', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'UOM', key: 'uom', width: 70,
                render: (_, r, i) => <Input value={r.uomCode} onChange={(e) => updateLine(i, 'uomCode', e.target.value)} />,
              },
              {
                title: 'Unit Price', key: 'price', width: 110,
                render: (_, r, i) => <InputNumber min={0} precision={4} value={r.unitPrice} onChange={(v) => updateLine(i, 'unitPrice', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'Amount', key: 'amount', width: 110, align: 'right' as const,
                render: (_, r) => Number(r.amount).toFixed(2),
              },
              {
                title: '', key: 'del', width: 40,
                render: (_, __, i) => (
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove" />
                ),
              },
            ]}
            footer={() => (
              <Button size="small" intent="default" icon={<PlusOutlined />} onClick={() => setLineItems((prev) => [...prev, { lineNumber: prev.length + 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 }])}>
                Add Line
              </Button>
            )}
          />

          <Divider orientation="left" orientationMargin={0} style={{ marginTop: 8 }}>Totals</Divider>
          <Form.Item label="Subtotal (auto)">
            <InputNumber value={subtotal} precision={2} style={{ width: 200 }} disabled />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Notes</Divider>
          <Form.Item name="notes">
            <Input.TextArea rows={2} placeholder="Special requirements, packing instructions, etc." />
          </Form.Item>

          {editing && (
            <>
              <Divider orientation="left" orientationMargin={0}>Irreversible Actions</Divider>
              <Space>
                {editing.status === 'CONFIRMED' && (
                  <Popconfirm title="Cancel this buyer PO?" onConfirm={() => { doAction('cancel', editing.id); setDrawerOpen(false); }}>
                    <Button danger icon={<CloseOutlined />}>Cancel PO</Button>
                  </Popconfirm>
                )}
              </Space>
            </>
          )}
        </Form>
      </Drawer>
    </>
  );
}