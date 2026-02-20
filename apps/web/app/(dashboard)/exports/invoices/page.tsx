'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Divider, Tag, Dropdown, Descriptions, Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined,
  CheckOutlined, LockOutlined, FilePdfOutlined, CopyOutlined,
  FolderViewOutlined, BankOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button } from '@exim/ui';
import PdfViewerModal from '../../../../components/pdf-viewer-modal';
import api from '../../../../lib/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'FINALIZED' | 'LOCKED';
  date: string;
  currency: string;
  totalAmount: number;
  exchangeRate: number;
  buyer: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  FINALIZED: 'blue',
  LOCKED: 'purple',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'CHF', 'CNY', 'AED'];
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DPU', 'DAP', 'DDP'];

export default function InvoicesPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; pdfUrl: string | null; title: string; filename: string }>({ open: false, pdfUrl: null, title: '', filename: '' });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<any[]>([
    { lineNumber: 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 },
  ]);

  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);

  // ─── Document Set drawer ────────────────────────────────────────────────────
  const [docSetOpen, setDocSetOpen] = useState(false);
  const [docSetLoading, setDocSetLoading] = useState(false);
  const [docSet, setDocSet] = useState<any>(null);

  // ─── BRC drawer ─────────────────────────────────────────────────────────────
  const [brcOpen, setBrcOpen] = useState(false);
  const [brcInvoice, setBrcInvoice] = useState<Invoice | null>(null);
  const [brcSaving, setBrcSaving] = useState(false);
  const [brcForm] = Form.useForm();

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
      const { data } = await api.get('/invoices', { params });
      const payload = data.data || data;
      setRecords(payload.data || payload);
      setTotal(payload.total || (payload.data || payload).length);
    } catch {
      message.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const openDrawer = (inv?: Invoice) => {
    setEditing(inv || null);
    form.resetFields();
    setLineItems([{ lineNumber: 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 }]);
    if (inv) {
      api.get(`/invoices/${inv.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({ ...rec, date: rec.date ? dayjs(rec.date) : null });
        if (rec.lineItems?.length) setLineItems(rec.lineItems);
      });
    }
    setDrawerOpen(true);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      updated.amount = Number(updated.quantity || 0) * Number(updated.unitPrice || 0);
      next[index] = updated;
      return next;
    });
  };

  const addLineItem = () =>
    setLineItems((prev) => [
      ...prev,
      { lineNumber: prev.length + 1, description: '', quantity: 1, uomCode: 'PCS', unitPrice: 0, amount: 0 },
    ]);

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = { ...values, date: values.date?.toISOString(), lineItems };
      if (editing) {
        await api.put(`/invoices/${editing.id}`, body);
        message.success('Invoice updated');
      } else {
        await api.post('/invoices', body);
        message.success('Invoice created');
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
      if (action === 'finalize') await api.post(`/invoices/${id}/finalize`);
      else if (action === 'delete') await api.delete(`/invoices/${id}`);
      else if (action === 'lock') await api.post(`/invoices/${id}/lock`);
      else if (action === 'clone') {
        await api.post(`/invoices/${id}/clone`);
        message.success('Cloned as new draft');
        fetchRecords();
        return;
      }
      message.success('Done');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const downloadPdf = async (id: string, invoiceNumber: string) => {
    try {
      const { data } = await api.get(`/pdf/invoices/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download PDF');
    }
  };

  const viewPdf = (id: string, invoiceNumber: string) => {
    setPdfViewer({ open: true, pdfUrl: `/pdf/invoices/${id}`, title: invoiceNumber, filename: `${invoiceNumber}.pdf` });
  };

  const openDocSet = async (id: string) => {
    setDocSetOpen(true);
    setDocSetLoading(true);
    setDocSet(null);
    try {
      const { data } = await api.get(`/invoices/${id}/document-set`);
      setDocSet(data.data || data);
    } catch {
      message.error('Failed to load document set');
    } finally {
      setDocSetLoading(false);
    }
  };

  const openBrcDrawer = (inv: Invoice) => {
    setBrcInvoice(inv);
    brcForm.resetFields();
    setBrcOpen(true);
  };

  const onSaveBrc = async (values: any) => {
    if (!brcInvoice) return;
    setBrcSaving(true);
    try {
      await api.post('/bank-realization-certificates', {
        ...values,
        invoiceId: brcInvoice.id,
        realizationDate: values.realizationDate?.toISOString(),
      });
      message.success('BRC recorded');
      setBrcOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save BRC');
    } finally {
      setBrcSaving(false);
    }
  };

  const subtotal = lineItems.reduce((s, i) => s + Number(i.amount || 0), 0);

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice No.',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (n) => <span style={{ fontWeight: 500 }}>{n}</span>,
    },
    { title: 'Buyer', dataIndex: ['buyer', 'name'], key: 'buyer' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    {
      title: 'FOB Value',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'INR Equiv.',
      key: 'inr',
      align: 'right',
      render: (_, r) =>
        `₹${(Number(r.totalAmount) * Number(r.exchangeRate)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    },
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
        const items: any[] = [];
        if (r.status === 'DRAFT') {
          items.push({ key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => openDrawer(r) });
          items.push({ key: 'finalize', label: 'Finalize', icon: <CheckOutlined />, onClick: () => doAction('finalize', r.id) });
          items.push({ type: 'divider' as const });
          items.push({ key: 'view-pdf', label: 'Preview PDF', icon: <EyeOutlined />, onClick: () => viewPdf(r.id, r.invoiceNumber) });
          items.push({ type: 'divider' as const });
          items.push({ key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => doAction('delete', r.id) });
        }
        if (r.status === 'FINALIZED') {
          items.push({ key: 'lock', label: 'Lock (SB Filed)', icon: <LockOutlined />, onClick: () => doAction('lock', r.id) });
          items.push({ key: 'clone', label: 'Clone as draft', icon: <CopyOutlined />, onClick: () => doAction('clone', r.id) });
          items.push({ type: 'divider' as const });
          items.push({ key: 'view-pdf', label: 'View PDF', icon: <EyeOutlined />, onClick: () => viewPdf(r.id, r.invoiceNumber) });
          items.push({ key: 'pdf', label: 'Download PDF', icon: <FilePdfOutlined />, onClick: () => downloadPdf(r.id, r.invoiceNumber) });
          items.push({ key: 'docset', label: 'View Document Set', icon: <FolderViewOutlined />, onClick: () => openDocSet(r.id) });
        }
        if (r.status === 'LOCKED') {
          items.push({ key: 'brc', label: 'Record BRC', icon: <BankOutlined />, onClick: () => openBrcDrawer(r) });
          items.push({ key: 'clone', label: 'Clone as draft', icon: <CopyOutlined />, onClick: () => doAction('clone', r.id) });
          items.push({ type: 'divider' as const });
          items.push({ key: 'view-pdf', label: 'View PDF', icon: <EyeOutlined />, onClick: () => viewPdf(r.id, r.invoiceNumber) });
          items.push({ key: 'pdf', label: 'Download PDF', icon: <FilePdfOutlined />, onClick: () => downloadPdf(r.id, r.invoiceNumber) });
          items.push({ key: 'docset', label: 'View Document Set', icon: <FolderViewOutlined />, onClick: () => openDocSet(r.id) });
        }
        if (!items.length) return null;
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} aria-label="Actions" />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Commercial Invoices"
        breadcrumbs={[{ label: 'Exports' }, { label: 'Invoices' }]}
        actions={
          <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Invoice
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
              { value: 'LOCKED', label: 'Locked' },
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

      {/* ── Create / Edit Invoice Drawer ── */}
      <Drawer
        title={editing ? `Edit Invoice: ${editing.invoiceNumber}` : 'New Commercial Invoice'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {editing && (
                <Button intent="default" icon={<EyeOutlined />} onClick={() => viewPdf(editing.id, editing.invoiceNumber)}>
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
                filterOption={(input, opt) =>
                  (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={parties.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Form.Item>
            <Form.Item label="Notify Party" name="notifyParty" style={{ flex: 1 }}>
              <Input placeholder="Optional" />
            </Form.Item>
            <Form.Item label="Invoice Date" name="date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Shipping Details</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Pre-Carriage by" name="preCarriage"><Input placeholder="e.g. Truck" /></Form.Item>
            <Form.Item label="Place of Receipt" name="placeOfReceipt"><Input placeholder="e.g. Mumbai" /></Form.Item>
            <Form.Item label="Vessel / Flight" name="vesselFlight"><Input placeholder="Flight or vessel no." /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Port of Loading" name="portOfLoading"><Input placeholder="e.g. INMAA" /></Form.Item>
            <Form.Item label="Port of Discharge" name="portOfDischarge"><Input placeholder="e.g. USLAX" /></Form.Item>
            <Form.Item label="Final Destination" name="finalDestination"><Input placeholder="e.g. Los Angeles" /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Country of Origin" name="countryOfOrigin"><Input placeholder="e.g. IN" /></Form.Item>
            <Form.Item label="Country of Destination" name="countryOfDestination"><Input placeholder="e.g. US" /></Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Trade Terms</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Incoterm" name="incoterm">
              <Select options={INCOTERMS.map((t) => ({ value: t, label: t }))} placeholder="Select" />
            </Form.Item>
            <Form.Item label="Currency" name="currency" initialValue="USD">
              <Select options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item label="Exchange Rate (INR)" name="exchangeRate">
              <InputNumber min={0} precision={6} style={{ width: '100%' }} placeholder="Auto-filled on create" />
            </Form.Item>
            <Form.Item label="Payment Terms" name="paymentTerms">
              <Input placeholder="e.g. NET30" />
            </Form.Item>
          </Space>
          <Form.Item label="Export Declaration" name="exportDeclaration" initialValue="LUT">
            <Select
              options={[
                { value: 'LUT', label: 'LUT (Zero Rated)' },
                { value: 'BOND_IGST', label: 'Bond with IGST' },
                { value: 'PAID_IGST', label: 'Paid IGST' },
              ]}
            />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Line Items</Divider>
          <Table
            dataSource={lineItems}
            rowKey={(_, i) => String(i)}
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
            columns={[
              {
                title: 'Description', key: 'desc', width: 180,
                render: (_, r, i) => <Input value={r.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} />,
              },
              {
                title: 'HS Code', key: 'hs', width: 90,
                render: (_, r, i) => <Input value={r.hsCode} onChange={(e) => updateLineItem(i, 'hsCode', e.target.value)} />,
              },
              {
                title: 'Qty', key: 'qty', width: 70,
                render: (_, r, i) => <InputNumber min={0} value={r.quantity} onChange={(v) => updateLineItem(i, 'quantity', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'UOM', key: 'uom', width: 70,
                render: (_, r, i) => <Input value={r.uomCode} onChange={(e) => updateLineItem(i, 'uomCode', e.target.value)} />,
              },
              {
                title: 'Unit Price', key: 'price', width: 100,
                render: (_, r, i) => <InputNumber min={0} precision={4} value={r.unitPrice} onChange={(v) => updateLineItem(i, 'unitPrice', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'Net Wt', key: 'nw', width: 80,
                render: (_, r, i) => <InputNumber min={0} precision={3} value={r.netWeight} onChange={(v) => updateLineItem(i, 'netWeight', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'Gross Wt', key: 'gw', width: 80,
                render: (_, r, i) => <InputNumber min={0} precision={3} value={r.grossWeight} onChange={(v) => updateLineItem(i, 'grossWeight', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'Amount', key: 'amount', width: 100, align: 'right',
                render: (_, r) => Number(r.amount).toFixed(2),
              },
              {
                title: '', key: 'del', width: 40,
                render: (_, __, i) => (
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setLineItems((p) => p.filter((_, j) => j !== i))} aria-label="Remove" />
                ),
              },
            ]}
            footer={() => <Button size="small" intent="default" icon={<PlusOutlined />} onClick={addLineItem}>Add Line</Button>}
          />

          <Divider orientation="left" orientationMargin={0}>Totals</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="FOB Subtotal (auto)">
              <InputNumber value={subtotal} precision={2} style={{ width: '100%' }} disabled />
            </Form.Item>
            <Form.Item label="Freight" name="freight">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
            <Form.Item label="Insurance" name="insurance">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Notes</Divider>
          <Form.Item label="Shipping Marks" name="shippingMarks">
            <Input.TextArea rows={2} placeholder="Marks & numbers on packages" />
          </Form.Item>
          <Form.Item label="Terms & Conditions" name="termsContent">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ── Document Set Drawer ── */}
      <Drawer
        title="Document Set"
        open={docSetOpen}
        onClose={() => setDocSetOpen(false)}
        width={560}
      >
        {docSetLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : docSet ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {docSet.proformaInvoice && (
              <Card size="small" title="Proforma Invoice">
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="PI Number">{docSet.proformaInvoice.piNumber}</Descriptions.Item>
                  <Descriptions.Item label="Version">v{docSet.proformaInvoice.version}</Descriptions.Item>
                  <Descriptions.Item label="Status"><Tag>{docSet.proformaInvoice.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Date">{dayjs(docSet.proformaInvoice.date).format('DD MMM YYYY')}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            {docSet.packingLists?.length > 0 && (
              <Card size="small" title={`Packing Lists (${docSet.packingLists.length})`}>
                {docSet.packingLists.map((pl: any) => (
                  <Descriptions key={pl.id} size="small" column={2} style={{ marginBottom: 8 }}>
                    <Descriptions.Item label="PL Number">{pl.plNumber}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag>{pl.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Packages">{pl.totalPackages}</Descriptions.Item>
                    <Descriptions.Item label="Gross Wt">{Number(pl.totalGrossWeight).toFixed(3)} kg</Descriptions.Item>
                  </Descriptions>
                ))}
              </Card>
            )}
            {docSet.shippingBills?.length > 0 && (
              <Card size="small" title={`Shipping Bills (${docSet.shippingBills.length})`}>
                {docSet.shippingBills.map((sb: any) => (
                  <Descriptions key={sb.id} size="small" column={2} style={{ marginBottom: 8 }}>
                    <Descriptions.Item label="SB Number">{sb.sbNumber || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag>{sb.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Port">{sb.portCode}</Descriptions.Item>
                    <Descriptions.Item label="FOB (INR)">₹{Number(sb.totalFobInr).toLocaleString('en-IN')}</Descriptions.Item>
                  </Descriptions>
                ))}
              </Card>
            )}
            {docSet.bankRealizationCertificates?.length > 0 && (
              <Card size="small" title={`BRC Records (${docSet.bankRealizationCertificates.length})`}>
                {docSet.bankRealizationCertificates.map((brc: any) => (
                  <Descriptions key={brc.id} size="small" column={2} style={{ marginBottom: 8 }}>
                    <Descriptions.Item label="BRC No.">{brc.brcNumber || 'Pending'}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={brc.status === 'RECEIVED' ? 'green' : 'default'}>{brc.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Amount">{brc.foreignCurrency} {Number(brc.foreignAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Descriptions.Item>
                    <Descriptions.Item label="INR">₹{Number(brc.inrAmount).toLocaleString('en-IN')}</Descriptions.Item>
                  </Descriptions>
                ))}
              </Card>
            )}
          </Space>
        ) : null}
      </Drawer>

      {/* ── Record BRC Drawer ── */}
      <Drawer
        title={`Record BRC — ${brcInvoice?.invoiceNumber}`}
        open={brcOpen}
        onClose={() => setBrcOpen(false)}
        width={500}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button intent="default" onClick={() => setBrcOpen(false)}>Cancel</Button>
            <Button intent="primary" loading={brcSaving} onClick={() => brcForm.submit()}>Save BRC</Button>
          </Space>
        }
      >
        <Form form={brcForm} layout="vertical" onFinish={onSaveBrc}>
          <Form.Item label="Bank Name" name="bankName" rules={[{ required: true }]}>
            <Input placeholder="e.g. HDFC Bank, Fort Branch" />
          </Form.Item>
          <Form.Item label="Realization Date" name="realizationDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Foreign Currency" name="foreignCurrency" initialValue={brcInvoice?.currency || 'USD'} rules={[{ required: true }]}>
              <Select options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item label="Foreign Amount" name="foreignAmount" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Exchange Rate (INR)" name="exchangeRate" rules={[{ required: true }]}>
              <InputNumber min={0} precision={6} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="INR Amount" name="inrAmount" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item label="BRC Number (if received)" name="brcNumber">
            <Input placeholder="Leave blank if pending" />
          </Form.Item>
          <Form.Item label="Discrepancy Notes" name="discrepancyNotes">
            <Input.TextArea rows={2} />
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