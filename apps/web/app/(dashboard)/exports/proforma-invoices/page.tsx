'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Divider, Tag, Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined,
  CheckOutlined, RetweetOutlined, SwapOutlined, CloseOutlined,
  FilePdfOutlined, CopyOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button } from '@exim/ui';
import PdfViewerModal from '../../../../components/pdf-viewer-modal';
import api from '../../../../lib/api';

interface PI {
  id: string;
  piNumber: string;
  version: number;
  status: 'DRAFT' | 'FINALIZED' | 'CONVERTED' | 'CANCELLED';
  date: string;
  validUntil?: string;
  currency: string;
  totalAmount: number;
  buyer: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  FINALIZED: 'blue',
  CONVERTED: 'green',
  CANCELLED: 'red',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'CHF', 'CNY', 'AED'];

export default function ProformaInvoicesPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<PI[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; pdfUrl: string | null; title: string; filename: string }>({ open: false, pdfUrl: null, title: '', filename: '' });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PI | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<any[]>([{ lineNumber: 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 }]);

  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);

  const fetchParties = useCallback(async () => {
    const { data } = await api.get('/parties', { params: { pageSize: 200 } });
    const p = data.data || data;
    setParties(p.data || p);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/proforma-invoices', { params });
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
      setTotal(payload.total || (Array.isArray(payload) ? payload.length : 0));
    } catch {
      message.error('Failed to load proforma invoices');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const openDrawer = (pi?: PI) => {
    setEditing(pi || null);
    form.resetFields();
    setLineItems([{ lineNumber: 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 }]);
    if (pi) {
      // Load full PI for editing
      api.get(`/proforma-invoices/${pi.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({
          ...rec,
          date: rec.date ? dayjs(rec.date) : null,
          validUntil: rec.validUntil ? dayjs(rec.validUntil) : null,
        });
        if (rec.lineItems?.length) setLineItems(rec.lineItems);
      });
    }
    setDrawerOpen(true);
  };

  const calcLineTotal = (li: any) => {
    const amt = Number(li.quantity || 0) * Number(li.unitPrice || 0);
    return { ...li, amount: amt };
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = calcLineTotal({ ...next[index], [field]: value });
      return next;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { lineNumber: prev.length + 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        ...values,
        date: values.date?.toISOString(),
        validUntil: values.validUntil?.toISOString() ?? null,
        lineItems,
      };
      if (editing) {
        await api.put(`/proforma-invoices/${editing.id}`, body);
        message.success('Proforma invoice updated');
      } else {
        await api.post('/proforma-invoices', body);
        message.success('Proforma invoice created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (id: string, piNumber: string) => {
    try {
      const { data } = await api.get(`/pdf/proforma-invoices/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${piNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download PDF');
    }
  };

  const viewPdf = (id: string, piNumber: string) => {
    setPdfViewer({ open: true, pdfUrl: `/pdf/proforma-invoices/${id}`, title: piNumber, filename: `${piNumber}.pdf` });
  };

  const doAction = async (action: string, id: string) => {
    try {
      if (action === 'finalize') {
        await api.post(`/proforma-invoices/${id}/finalize`);
        message.success('Finalized');
      } else if (action === 'revise') {
        await api.post(`/proforma-invoices/${id}/revise`);
        message.success('Revision created');
      } else if (action === 'convert') {
        await api.post(`/proforma-invoices/${id}/convert`);
        message.success('Converted to Commercial Invoice');
      } else if (action === 'cancel') {
        await api.delete(`/proforma-invoices/${id}`);
        message.success('Cancelled');
      } else if (action === 'clone') {
        await api.post(`/proforma-invoices/${id}/clone`);
        message.success('Cloned as new draft');
      }
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const subtotal = lineItems.reduce((s, i) => s + Number(i.amount || 0), 0);

  const columns: ColumnsType<PI> = [
    {
      title: 'PI Number',
      dataIndex: 'piNumber',
      key: 'piNumber',
      render: (n, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{n}</span>
          <span style={{ fontSize: 12, color: '#888' }}>v{r.version}</span>
        </Space>
      ),
    },
    { title: 'Buyer', dataIndex: ['buyer', 'name'], key: 'buyer' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Valid Until', dataIndex: 'validUntil', key: 'validUntil', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => {
        const menuItems = [];
        if (r.status === 'DRAFT') {
          menuItems.push({ key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => openDrawer(r) });
          menuItems.push({ key: 'finalize', label: 'Finalize', icon: <CheckOutlined />, onClick: () => doAction('finalize', r.id) });
          menuItems.push({ type: 'divider' as const });
          menuItems.push({ key: 'view-pdf', label: 'Preview PDF', icon: <EyeOutlined />, onClick: () => viewPdf(r.id, r.piNumber) });
          menuItems.push({ type: 'divider' as const });
          menuItems.push({ key: 'cancel', label: 'Cancel', icon: <CloseOutlined />, danger: true, onClick: () => doAction('cancel', r.id) });
        }
        if (r.status === 'FINALIZED') {
          menuItems.push({ key: 'revise', label: 'Revise (new version)', icon: <RetweetOutlined />, onClick: () => doAction('revise', r.id) });
          menuItems.push({ key: 'convert', label: 'Convert to Invoice', icon: <SwapOutlined />, onClick: () => doAction('convert', r.id) });
          menuItems.push({ key: 'clone', label: 'Clone as new draft', icon: <CopyOutlined />, onClick: () => doAction('clone', r.id) });
          menuItems.push({ type: 'divider' as const });
          menuItems.push({ key: 'view-pdf', label: 'View PDF', icon: <EyeOutlined />, onClick: () => viewPdf(r.id, r.piNumber) });
          menuItems.push({ key: 'pdf', label: 'Download PDF', icon: <FilePdfOutlined />, onClick: () => downloadPdf(r.id, r.piNumber) });
        }
        if (r.status === 'CONVERTED') {
          menuItems.push({ key: 'view-pdf', label: 'View PDF', icon: <EyeOutlined />, onClick: () => viewPdf(r.id, r.piNumber) });
          menuItems.push({ key: 'pdf', label: 'Download PDF', icon: <FilePdfOutlined />, onClick: () => downloadPdf(r.id, r.piNumber) });
        }
        if (!menuItems.length) return null;
        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} aria-label="Actions" />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Proforma Invoices"
        breadcrumbs={[{ label: 'Exports' }, { label: 'Proforma Invoices' }]}
        actions={
          <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New PI
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
            options={[
              { value: '', label: 'All statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'FINALIZED', label: 'Finalized' },
              { value: 'CONVERTED', label: 'Converted' },
              { value: 'CANCELLED', label: 'Cancelled' },
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

      <Drawer
        title={editing ? `Edit PI: ${editing.piNumber}` : 'New Proforma Invoice'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={760}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {editing && (
                <Button intent="default" icon={<EyeOutlined />} onClick={() => viewPdf(editing.id, editing.piNumber)}>
                  Preview PDF
                </Button>
              )}
            </div>
            <Space>
              <Button intent="default" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button intent="primary" loading={saving} onClick={() => form.submit()}>
                {editing ? 'Update' : 'Create'}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Divider orientation="left" orientationMargin={0}>Header</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Buyer" name="buyerPartyId" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Select
                showSearch
                placeholder="Select buyer"
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                options={parties.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Form.Item>
            <Form.Item label="Date" name="date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Valid Until" name="validUntil" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Shipping</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Incoterm" name="incoterm" rules={[{ required: true }]}>
              <Input placeholder="e.g. FOB" />
            </Form.Item>
            <Form.Item label="Port of Loading" name="portOfLoading">
              <Input placeholder="e.g. INMAA" />
            </Form.Item>
            <Form.Item label="Port of Discharge" name="portOfDischarge">
              <Input placeholder="e.g. USLAX" />
            </Form.Item>
            <Form.Item label="Delivery Timeline" name="deliveryTimeline">
              <Input placeholder="e.g. 30 days" />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Payment</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Currency" name="currency" initialValue="USD">
              <Select options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item label="Payment Terms" name="paymentTerms">
              <Input placeholder="e.g. 30% advance, balance against BL" />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Line Items</Divider>
          <Table
            dataSource={lineItems}
            rowKey={(_, i) => String(i)}
            pagination={false}
            size="small"
            columns={[
              { title: 'Description', key: 'desc', render: (_, r, i) => <Input value={r.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} placeholder="Product / description" /> },
              { title: 'HS Code', key: 'hs', width: 100, render: (_, r, i) => <Input value={r.hsCode} onChange={(e) => updateLineItem(i, 'hsCode', e.target.value)} /> },
              { title: 'Qty', key: 'qty', width: 80, render: (_, r, i) => <InputNumber min={0} value={r.quantity} onChange={(v) => updateLineItem(i, 'quantity', v)} style={{ width: '100%' }} /> },
              { title: 'UOM', key: 'uom', width: 80, render: (_, r, i) => <Input value={r.uomCode} onChange={(e) => updateLineItem(i, 'uomCode', e.target.value)} /> },
              { title: 'Unit Price', key: 'price', width: 110, render: (_, r, i) => <InputNumber min={0} precision={4} value={r.unitPrice} onChange={(v) => updateLineItem(i, 'unitPrice', v)} style={{ width: '100%' }} /> },
              { title: 'Amount', key: 'amount', width: 110, align: 'right', render: (_, r) => Number(r.amount).toFixed(2) },
              { title: '', key: 'del', width: 40, render: (_, __, i) => <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeLineItem(i)} aria-label="Remove" /> },
            ]}
            footer={() => (
              <Button size="small" intent="default" icon={<PlusOutlined />} onClick={addLineItem}>Add Line</Button>
            )}
          />

          <Divider orientation="left" orientationMargin={0}>Totals</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Freight" name="freight">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
            <Form.Item label="Insurance" name="insurance">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
            <Form.Item label="Subtotal (auto)">
              <InputNumber value={subtotal} precision={2} style={{ width: '100%' }} disabled />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Terms</Divider>
          <Form.Item label="Terms & Conditions" name="termsContent">
            <Input.TextArea rows={3} placeholder="Payment and delivery terms..." />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Special instructions..." />
          </Form.Item>
        </Form>
      </Drawer>

      <PdfViewerModal
        open={pdfViewer.open}
        title={pdfViewer.title}
        pdfUrl={pdfViewer.pdfUrl}
        filename={pdfViewer.filename}
        onClose={() => setPdfViewer(v => ({ ...v, open: false }))}
      />
    </>
  );
}