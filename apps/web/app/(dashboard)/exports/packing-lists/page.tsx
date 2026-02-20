'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Divider, Tag, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, CheckOutlined, EditOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button } from '@exim/ui';
import PdfViewerModal from '../../../../components/pdf-viewer-modal';
import api from '../../../../lib/api';

interface PL {
  id: string;
  plNumber: string;
  status: 'DRAFT' | 'FINALIZED';
  date: string;
  invoiceId: string;
  totalPackages?: number;
  totalNetWeight?: number;
  totalGrossWeight?: number;
  totalCbm?: number;
  invoice: { invoiceNumber: string };
}

export default function PackingListsPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<PL[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; pdfUrl: string | null; title: string; filename: string }>({ open: false, pdfUrl: null, title: '', filename: '' });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PL | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [packages, setPackages] = useState<any[]>([
    { packageNo: '1/1', contents: '', quantity: 1, netWeight: 0, grossWeight: 0, dimensionL: null, dimensionW: null, dimensionH: null },
  ]);

  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string }[]>([]);

  const fetchInvoices = useCallback(async () => {
    const { data } = await api.get('/invoices', { params: { limit: 200 } });
    const p = data.data || data;
    setInvoices(p.data || p);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/packing-lists', { params });
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
      setTotal(payload.total || (Array.isArray(payload) ? payload.length : 0));
    } catch {
      message.error('Failed to load packing lists');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, message]);

  useEffect(() => { fetchRecords(); fetchInvoices(); }, [fetchRecords, fetchInvoices]);

  const openDrawer = (pl?: PL) => {
    setEditing(pl || null);
    form.resetFields();
    setPackages([{ packageNo: '1/1', contents: '', quantity: 1, netWeight: 0, grossWeight: 0, dimensionL: null, dimensionW: null, dimensionH: null }]);
    if (pl) {
      api.get(`/packing-lists/${pl.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({ ...rec, date: rec.date ? dayjs(rec.date) : null });
        if (rec.packages?.length) setPackages(rec.packages);
      });
    }
    setDrawerOpen(true);
  };

  const calcCbm = (pkg: any) => {
    const l = Number(pkg.dimensionL || 0);
    const w = Number(pkg.dimensionW || 0);
    const h = Number(pkg.dimensionH || 0);
    if (l && w && h) return Math.round((l * w * h / 1_000_000) * 10_000) / 10_000;
    return pkg.cbm ?? null;
  };

  const updatePkg = (index: number, field: string, value: any) => {
    setPackages((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      updated.cbm = calcCbm(updated);
      next[index] = updated;
      return next;
    });
  };

  const addPkg = () =>
    setPackages((prev) => [
      ...prev,
      { packageNo: `${prev.length + 1}/${prev.length + 1}`, contents: '', quantity: 1, netWeight: 0, grossWeight: 0, dimensionL: null, dimensionW: null, dimensionH: null },
    ]);

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = { ...values, date: values.date?.toISOString(), packages };
      if (editing) {
        await api.put(`/packing-lists/${editing.id}`, body);
        message.success('Packing list updated');
      } else {
        await api.post('/packing-lists', body);
        message.success('Packing list created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (id: string, plNumber: string) => {
    try {
      const { data } = await api.get(`/pdf/packing-lists/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download PDF');
    }
  };

  const viewPdf = (id: string, plNumber: string) => {
    setPdfViewer({ open: true, pdfUrl: `/pdf/packing-lists/${id}`, title: plNumber, filename: `${plNumber}.pdf` });
  };

  const doFinalize = async (id: string) => {
    try {
      await api.post(`/packing-lists/${id}/finalize`);
      message.success('Finalized');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    }
  };

  const doDelete = async (id: string) => {
    try {
      await api.delete(`/packing-lists/${id}`);
      message.success('Deleted');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    }
  };

  // Totals row
  const totalNetWt = packages.reduce((s, p) => s + Number(p.netWeight || 0), 0);
  const totalGrossWt = packages.reduce((s, p) => s + Number(p.grossWeight || 0), 0);
  const totalCbm = packages.reduce((s, p) => s + Number(p.cbm || 0), 0);

  const columns: ColumnsType<PL> = [
    { title: 'PL Number', dataIndex: 'plNumber', key: 'plNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Invoice', dataIndex: ['invoice', 'invoiceNumber'], key: 'invoice' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Packages', dataIndex: 'totalPackages', key: 'totalPackages', align: 'center', render: (v) => v ?? '—' },
    { title: 'Net Wt (kg)', dataIndex: 'totalNetWeight', key: 'totalNetWeight', align: 'right', render: (v) => v ? Number(v).toFixed(3) : '—' },
    { title: 'Gross Wt (kg)', dataIndex: 'totalGrossWeight', key: 'totalGrossWeight', align: 'right', render: (v) => v ? Number(v).toFixed(3) : '—' },
    { title: 'CBM', dataIndex: 'totalCbm', key: 'totalCbm', align: 'right', render: (v) => v ? Number(v).toFixed(4) : '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={s === 'FINALIZED' ? 'blue' : 'default'}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          {r.status === 'DRAFT' && (
            <>
              <Button size="small" intent="default" icon={<EyeOutlined />} onClick={() => viewPdf(r.id, r.plNumber)} aria-label="Preview PDF" />
              <Button size="small" intent="default" icon={<EditOutlined />} onClick={() => openDrawer(r)}>Edit</Button>
              <Popconfirm
                title="Finalize this packing list?"
                description="This cannot be undone."
                onConfirm={() => doFinalize(r.id)}
                okText="Finalize"
              >
                <Button size="small" icon={<CheckOutlined />} aria-label="Finalize" />
              </Popconfirm>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => doDelete(r.id)} aria-label="Delete" />
            </>
          )}
          {r.status === 'FINALIZED' && (
            <>
              <Button size="small" intent="default" icon={<EyeOutlined />} onClick={() => viewPdf(r.id, r.plNumber)} aria-label="View PDF" />
              <Button size="small" intent="default" icon={<FilePdfOutlined />} onClick={() => downloadPdf(r.id, r.plNumber)} aria-label="Download PDF" />
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Packing Lists"
        breadcrumbs={[{ label: 'Exports' }, { label: 'Packing Lists' }]}
        actions={
          <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Packing List
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
        title={editing ? `Edit PL: ${editing.plNumber}` : 'New Packing List'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={900}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {editing && (
                <Button intent="default" icon={<EyeOutlined />} onClick={() => viewPdf(editing.id, editing.plNumber)}>
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
            <Form.Item label="Invoice" name="invoiceId" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Select
                showSearch
                placeholder="Select invoice (auto-fills packages)"
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                options={invoices.map((inv) => ({ value: inv.id, label: inv.invoiceNumber }))}
              />
            </Form.Item>
            <Form.Item label="Date" name="date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item label="Shipping Marks" name="shippingMarks">
            <Input.TextArea rows={2} placeholder="Marks and numbers on packages" />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Packages</Divider>
          <Table
            dataSource={packages}
            rowKey={(_, i) => String(i)}
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
            columns={[
              {
                title: 'Pkg No.', key: 'pkgNo', width: 80,
                render: (_, r, i) => <Input value={r.packageNo} onChange={(e) => updatePkg(i, 'packageNo', e.target.value)} />,
              },
              {
                title: 'Contents', key: 'contents', width: 160,
                render: (_, r, i) => <Input value={r.contents} onChange={(e) => updatePkg(i, 'contents', e.target.value)} />,
              },
              {
                title: 'Qty', key: 'qty', width: 70,
                render: (_, r, i) => <InputNumber min={0} precision={4} value={r.quantity} onChange={(v) => updatePkg(i, 'quantity', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'Net Wt (kg)', key: 'nw', width: 90,
                render: (_, r, i) => <InputNumber min={0} precision={3} value={r.netWeight} onChange={(v) => updatePkg(i, 'netWeight', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'Gross Wt (kg)', key: 'gw', width: 90,
                render: (_, r, i) => <InputNumber min={0} precision={3} value={r.grossWeight} onChange={(v) => updatePkg(i, 'grossWeight', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'L (cm)', key: 'l', width: 75,
                render: (_, r, i) => <InputNumber min={0} precision={2} value={r.dimensionL} onChange={(v) => updatePkg(i, 'dimensionL', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'W (cm)', key: 'w', width: 75,
                render: (_, r, i) => <InputNumber min={0} precision={2} value={r.dimensionW} onChange={(v) => updatePkg(i, 'dimensionW', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'H (cm)', key: 'h', width: 75,
                render: (_, r, i) => <InputNumber min={0} precision={2} value={r.dimensionH} onChange={(v) => updatePkg(i, 'dimensionH', v)} style={{ width: '100%' }} />,
              },
              {
                title: 'CBM (auto)', key: 'cbm', width: 90, align: 'right',
                render: (_, r) => r.cbm != null ? Number(r.cbm).toFixed(4) : '—',
              },
              {
                title: '', key: 'del', width: 40,
                render: (_, __, i) => (
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setPackages((p) => p.filter((_, j) => j !== i))} aria-label="Remove" />
                ),
              },
            ]}
            footer={() => (
              <Space>
                <Button size="small" intent="default" icon={<PlusOutlined />} onClick={addPkg}>Add Package</Button>
                <span style={{ color: '#888', fontSize: 12 }}>
                  {packages.length} pkg | Net {totalNetWt.toFixed(3)} kg | Gross {totalGrossWt.toFixed(3)} kg | {totalCbm.toFixed(4)} CBM
                </span>
              </Space>
            )}
          />

          <Divider orientation="left" orientationMargin={0}>Notes</Divider>
          <Form.Item label="Notes" name="notes">
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