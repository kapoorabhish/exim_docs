'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  DatePicker, InputNumber, Divider, Tag, Modal, Steps, Descriptions, Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, MoreOutlined, EditOutlined, ApartmentOutlined, FilePdfOutlined } from '@ant-design/icons';
import PdfViewerModal from '../../../../components/pdf-viewer-modal';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

interface SB {
  id: string;
  sbNumber?: string;
  sbType: 'FREE' | 'DRAWBACK' | 'RODTEP' | 'EPCG';
  status: 'DRAFT' | 'FILED' | 'UNDER_ASSESSMENT' | 'ASSESSED' | 'LEO' | 'SHIPPED';
  date: string;
  portCode: string;
  modeOfShipment: string;
  totalFobInr: number;
  invoice: { id: string; invoiceNumber: string };
}

const STATUS_ORDER = ['DRAFT', 'FILED', 'UNDER_ASSESSMENT', 'ASSESSED', 'LEO', 'SHIPPED'];
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', FILED: 'Filed', UNDER_ASSESSMENT: 'Under Assessment',
  ASSESSED: 'Assessed', LEO: 'LEO', SHIPPED: 'Shipped',
};
const SB_TYPE_COLOR: Record<string, string> = {
  FREE: 'default', DRAWBACK: 'orange', RODTEP: 'blue', EPCG: 'purple',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', FILED: 'processing', UNDER_ASSESSMENT: 'warning',
  ASSESSED: 'cyan', LEO: 'geekblue', SHIPPED: 'green',
};

export default function ShippingBillsPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<SB[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SB | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<any[]>([
    { lineNumber: 1, description: '', hsCode: '', quantity: 1, uomCode: 'PCS', unitPriceInr: 0, fobValueInr: 0 },
  ]);

  // Status transition modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<SB | null>(null);
  const [statusForm] = Form.useForm();
  const [transitioning, setTransitioning] = useState(false);

  // Detail view (status history)
  const [detailRecord, setDetailRecord] = useState<any>(null);

  const [invView, setInvView] = useState<{ open: boolean; loading: boolean; data: any }>({ open: false, loading: false, data: null });
  const [pdfModal, setPdfModal] = useState<{ open: boolean; url: string | null; title: string; filename: string }>({ open: false, url: null, title: '', filename: '' });

  // B/L form
  const [blOpen, setBlOpen] = useState(false);
  const [blSb, setBlSb] = useState<SB | null>(null);
  const [blSaving, setBlSaving] = useState(false);
  const [blForm] = Form.useForm();

  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string }[]>([]);

  const fetchInvoices = useCallback(async () => {
    const { data } = await api.get('/invoices', { params: { limit: 200 } });
    const p = data.data || data;
    setInvoices(p.data || p);
  }, []);

  const openInvView = async (invoiceId: string) => {
    setInvView({ open: true, loading: true, data: null });
    try {
      const { data } = await api.get(`/invoices/${invoiceId}`);
      setInvView({ open: true, loading: false, data: data.data || data });
    } catch {
      message.error('Failed to load invoice details');
      setInvView({ open: false, loading: false, data: null });
    }
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.sbType = typeFilter;
      const { data } = await api.get('/shipping-bills', { params });
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
      setTotal(payload.total || (Array.isArray(payload) ? payload.length : 0));
    } catch {
      message.error('Failed to load shipping bills');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, message]);

  useEffect(() => { fetchRecords(); fetchInvoices(); }, [fetchRecords, fetchInvoices]);

  const openDrawer = (sb?: SB) => {
    setEditing(sb || null);
    form.resetFields();
    setLineItems([{ lineNumber: 1, description: '', hsCode: '', quantity: 1, uomCode: 'PCS', unitPriceInr: 0, fobValueInr: 0 }]);
    if (sb) {
      api.get(`/shipping-bills/${sb.id}`).then(({ data }) => {
        const rec = data.data || data;
        form.setFieldsValue({ ...rec, date: rec.date ? dayjs(rec.date) : null });
        if (rec.lineItems?.length) setLineItems(rec.lineItems);
        setDetailRecord(rec);
      });
    } else {
      setDetailRecord(null);
    }
    setDrawerOpen(true);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      updated.fobValueInr = Number(updated.quantity || 0) * Number(updated.unitPriceInr || 0);
      next[index] = updated;
      return next;
    });
  };

  const addLineItem = () =>
    setLineItems((prev) => [
      ...prev,
      { lineNumber: prev.length + 1, description: '', hsCode: '', quantity: 1, uomCode: 'PCS', unitPriceInr: 0, fobValueInr: 0 },
    ]);

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      const body = { ...values, date: values.date?.toISOString(), lineItems };
      if (editing) {
        await api.put(`/shipping-bills/${editing.id}`, body);
        message.success('Shipping bill updated');
      } else {
        await api.post('/shipping-bills', body);
        message.success('Shipping bill created');
      }
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = (sb: SB) => {
    setStatusTarget(sb);
    statusForm.resetFields();
    setStatusModalOpen(true);
  };

  const submitStatusTransition = async (values: any) => {
    if (!statusTarget) return;
    setTransitioning(true);
    const nextStatus: Record<string, string> = {
      DRAFT: 'FILED', FILED: 'UNDER_ASSESSMENT', UNDER_ASSESSMENT: 'ASSESSED',
      ASSESSED: 'LEO', LEO: 'SHIPPED',
    };
    try {
      await api.post(`/shipping-bills/${statusTarget.id}/status`, {
        status: nextStatus[statusTarget.status],
        notes: values.notes,
        leoNumber: values.leoNumber,
        leoDate: values.leoDate?.toISOString(),
      });
      message.success(`Status updated to ${nextStatus[statusTarget.status]}`);
      setStatusModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  const doDelete = async (id: string) => {
    try {
      await api.delete(`/shipping-bills/${id}`);
      message.success('Deleted');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed');
    }
  };

  const openBlDrawer = (sb: SB) => {
    setBlSb(sb);
    blForm.resetFields();
    setBlOpen(true);
  };

  const onSaveBl = async (values: any) => {
    if (!blSb) return;
    setBlSaving(true);
    try {
      await api.post('/bills-of-lading', {
        ...values,
        shippingBillId: blSb.id,
        blDate: values.blDate?.toISOString(),
      });
      message.success('Bill of Lading recorded');
      setBlOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save B/L');
    } finally {
      setBlSaving(false);
    }
  };

  const totalFob = lineItems.reduce((s, i) => s + Number(i.fobValueInr || 0), 0);

  const columns: ColumnsType<SB> = [
    {
      title: 'SB Number',
      key: 'sbNumber',
      render: (_, r) => <span style={{ fontWeight: 500 }}>{r.sbNumber || <span style={{ color: '#bbb' }}>Pending</span>}</span>,
    },
    {
      title: 'Invoice', key: 'invoice',
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openInvView(r.invoice.id)}>
          {r.invoice?.invoiceNumber}
        </Button>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'sbType',
      key: 'sbType',
      render: (t) => <Tag color={SB_TYPE_COLOR[t]}>{t}</Tag>,
    },
    { title: 'Port', dataIndex: 'portCode', key: 'port' },
    { title: 'Mode', dataIndex: 'modeOfShipment', key: 'mode' },
    {
      title: 'FOB (INR)',
      dataIndex: 'totalFobInr',
      key: 'fob',
      align: 'right',
      render: (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          {r.status === 'DRAFT' && (
            <>
              <Button size="small" intent="default" icon={<EditOutlined />} onClick={() => openDrawer(r)}>Edit</Button>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => doDelete(r.id)} aria-label="Delete" />
            </>
          )}
          {r.status !== 'SHIPPED' && (
            <Button size="small" intent="default" icon={<MoreOutlined />} onClick={() => openStatusModal(r)}>
              Update Status
            </Button>
          )}
          {['FILED', 'UNDER_ASSESSMENT', 'ASSESSED', 'LEO', 'SHIPPED'].includes(r.status) && (
            <Button size="small" intent="default" icon={<ApartmentOutlined />} onClick={() => openBlDrawer(r)}>
              B/L
            </Button>
          )}
          <Button size="small" intent="default" onClick={() => openDrawer(r)}>History</Button>
        </Space>
      ),
    },
  ];

  const isLeoTransition = statusTarget?.status === 'ASSESSED';

  return (
    <>
      <PageHeader
        title="Shipping Bills"
        breadcrumbs={[{ label: 'Exports' }, { label: 'Shipping Bills' }]}
        actions={
          <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Shipping Bill
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 180 }}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={[{ value: '', label: 'All statuses' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
          />
          <Select
            placeholder="SB Type"
            allowClear
            style={{ width: 150 }}
            onChange={(v) => { setTypeFilter(v || ''); setPage(1); }}
            options={[{ value: '', label: 'All types' }, ...['FREE', 'DRAWBACK', 'RODTEP', 'EPCG'].map((t) => ({ value: t, label: t }))]}
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

      {/* Create / Edit Drawer */}
      <Drawer
        title={editing ? `Shipping Bill: ${editing.sbNumber || 'Draft'}` : 'New Shipping Bill'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={860}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button intent="default" onClick={() => setDrawerOpen(false)}>Close</Button>
            {(!editing || editing.status === 'DRAFT') && (
              <Button intent="primary" loading={saving} onClick={() => form.submit()}>
                {editing ? 'Update' : 'Create'}
              </Button>
            )}
          </Space>
        }
      >
        {/* Status Timeline */}
        {detailRecord && (
          <>
            <Divider orientation="left" orientationMargin={0}>Status Timeline</Divider>
            <Steps
              size="small"
              current={STATUS_ORDER.indexOf(detailRecord.status)}
              items={STATUS_ORDER.map((s) => ({ title: STATUS_LABELS[s] }))}
              style={{ marginBottom: 16 }}
            />
            {detailRecord.statusHistory?.length > 0 && (
              <Table
                dataSource={detailRecord.statusHistory}
                rowKey="id"
                size="small"
                pagination={false}
                style={{ marginBottom: 16 }}
                columns={[
                  { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABELS[s]}</Tag> },
                  { title: 'Date', dataIndex: 'changedAt', key: 'changedAt', render: (d) => dayjs(d).format('DD MMM YYYY HH:mm') },
                  { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (n) => n || '—' },
                ]}
              />
            )}
            {detailRecord.leoNumber && (
              <Descriptions size="small" style={{ marginBottom: 16 }} column={2}>
                <Descriptions.Item label="LEO Number">{detailRecord.leoNumber}</Descriptions.Item>
                <Descriptions.Item label="LEO Date">{dayjs(detailRecord.leoDate).format('DD MMM YYYY')}</Descriptions.Item>
              </Descriptions>
            )}
          </>
        )}

        {(!editing || editing.status === 'DRAFT') && (
          <Form form={form} layout="vertical" onFinish={onSave}>
            <Divider orientation="left" orientationMargin={0}>Header</Divider>
            <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
              <Form.Item label="SB Type" name="sbType" initialValue="FREE">
                <Select options={['FREE', 'DRAWBACK', 'RODTEP', 'EPCG'].map((t) => ({ value: t, label: t }))} />
              </Form.Item>
              <Form.Item label="Date" name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="SB Number (ICEGATE)" name="sbNumber">
                <Input placeholder="Filled after filing" />
              </Form.Item>
            </Space>
            <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
              <Form.Item label="Invoice" name="invoiceId" rules={[{ required: !editing }]}>
                <Select
                  showSearch
                  placeholder="Select invoice"
                  disabled={!!editing}
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  options={invoices.map((inv) => ({ value: inv.id, label: inv.invoiceNumber }))}
                />
              </Form.Item>
              <Form.Item label="Port Code" name="portCode" rules={[{ required: true }]}>
                <Input placeholder="e.g. INMAA" />
              </Form.Item>
              <Form.Item label="Mode of Shipment" name="modeOfShipment" initialValue="SEA">
                <Select options={['SEA', 'AIR', 'ROAD', 'RAIL'].map((m) => ({ value: m, label: m }))} />
              </Form.Item>
              <Form.Item label="Country of Destination" name="countryOfDestination" rules={[{ required: true }]}>
                <Input placeholder="e.g. US" />
              </Form.Item>
            </Space>

            <Divider orientation="left" orientationMargin={0}>Line Items (INR)</Divider>
            <Table
              dataSource={lineItems}
              rowKey={(_, i) => String(i)}
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
              columns={[
                {
                  title: 'Description', key: 'desc', width: 160,
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
                  title: 'Unit Price (INR)', key: 'price', width: 110,
                  render: (_, r, i) => <InputNumber min={0} precision={4} value={r.unitPriceInr} onChange={(v) => updateLineItem(i, 'unitPriceInr', v)} style={{ width: '100%' }} />,
                },
                {
                  title: 'FOB Value (INR)', key: 'fob', width: 110, align: 'right',
                  render: (_, r) => `₹${Number(r.fobValueInr).toFixed(2)}`,
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

            <Divider orientation="left" orientationMargin={0}>Totals (INR)</Divider>
            <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
              <Form.Item label="Total FOB (auto)">
                <InputNumber value={totalFob} precision={2} style={{ width: '100%' }} disabled addonBefore="₹" />
              </Form.Item>
              <Form.Item label="Freight (INR)" name="freightInr">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} addonBefore="₹" placeholder="0.00" />
              </Form.Item>
              <Form.Item label="Insurance (INR)" name="insuranceInr">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} addonBefore="₹" placeholder="0.00" />
              </Form.Item>
            </Space>

            <Divider orientation="left" orientationMargin={0}>Notes</Divider>
            <Form.Item label="Notes" name="notes">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        )}
      </Drawer>

      {/* Status Transition Modal */}
      <Modal
        title={`Update Status → ${STATUS_LABELS[({ DRAFT: 'FILED', FILED: 'UNDER_ASSESSMENT', UNDER_ASSESSMENT: 'ASSESSED', ASSESSED: 'LEO', LEO: 'SHIPPED' } as Record<string, string>)[statusTarget?.status || ''] || '']}`}
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={() => statusForm.submit()}
        okText="Confirm"
        confirmLoading={transitioning}
      >
        <Form form={statusForm} layout="vertical" onFinish={submitStatusTransition}>
          {isLeoTransition && (
            <>
              <Form.Item label="LEO Number" name="leoNumber" rules={[{ required: true, message: 'LEO number is required' }]}>
                <Input placeholder="Enter LEO number from ICEGATE" />
              </Form.Item>
              <Form.Item label="LEO Date" name="leoDate" rules={[{ required: true, message: 'LEO date is required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Optional notes for this status update" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Invoice Quick-View Drawer */}
      <Drawer
        title={invView.data?.invoiceNumber || 'Invoice Details'}
        open={invView.open}
        onClose={() => setInvView(v => ({ ...v, open: false }))}
        width={640}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            {invView.data && (
              <Button
                intent="default"
                icon={<FilePdfOutlined />}
                onClick={() => setPdfModal({
                  open: true,
                  url: `/pdf/invoices/${invView.data.id}`,
                  title: invView.data.invoiceNumber,
                  filename: `${invView.data.invoiceNumber}.pdf`,
                })}
              >
                Preview PDF
              </Button>
            )}
            <Button intent="default" onClick={() => setInvView(v => ({ ...v, open: false }))}>Close</Button>
          </Space>
        }
      >
        {invView.loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : invView.data ? (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Invoice No">{invView.data.invoiceNumber}</Descriptions.Item>
            <Descriptions.Item label="Date">{invView.data.date ? dayjs(invView.data.date).format('DD MMM YYYY') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Buyer">{invView.data.buyer?.name}</Descriptions.Item>
            <Descriptions.Item label="Currency">{invView.data.currency}</Descriptions.Item>
            <Descriptions.Item label="Total Amount">
              {invView.data.currency} {Number(invView.data.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusBadge status={invView.data.status?.toLowerCase() as DocumentStatusType} />
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <PdfViewerModal
        open={pdfModal.open}
        title={pdfModal.title}
        pdfUrl={pdfModal.url}
        filename={pdfModal.filename}
        onClose={() => setPdfModal(v => ({ ...v, open: false }))}
      />

      {/* ── Bill of Lading Drawer ── */}
      <Drawer
        title={`Bill of Lading — SB ${blSb?.sbNumber || 'Draft'}`}
        open={blOpen}
        onClose={() => setBlOpen(false)}
        width={540}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button intent="default" onClick={() => setBlOpen(false)}>Cancel</Button>
            <Button intent="primary" loading={blSaving} onClick={() => blForm.submit()}>Save B/L</Button>
          </Space>
        }
      >
        <Form form={blForm} layout="vertical" onFinish={onSaveBl}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="B/L Number" name="blNumber" rules={[{ required: true }]}>
              <Input placeholder="e.g. HLCUSHA2502XXXXX" />
            </Form.Item>
            <Form.Item label="B/L Date" name="blDate" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="B/L Type" name="blType" initialValue="ORIGINAL">
              <Select options={[
                { value: 'ORIGINAL', label: 'Original' },
                { value: 'TELEX_RELEASE', label: 'Telex Release' },
                { value: 'SEA_WAYBILL', label: 'Sea Waybill' },
                { value: 'HOUSE_BL', label: 'House B/L' },
                { value: 'MASTER_BL', label: 'Master B/L' },
              ]} />
            </Form.Item>
            <Form.Item label="Originals Issued" name="originalsIssued" initialValue={3}>
              <InputNumber min={0} max={3} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item label="Invoice" name="invoiceId" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select invoice"
              options={invoices.map((inv) => ({ value: inv.id, label: inv.invoiceNumber }))}
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Vessel Name" name="vesselName">
              <Input placeholder="e.g. MSC AURORA" />
            </Form.Item>
            <Form.Item label="Voyage No." name="voyageNumber">
              <Input placeholder="e.g. 502N" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Port of Loading" name="portOfLoading">
              <Input placeholder="e.g. INMAA" />
            </Form.Item>
            <Form.Item label="Port of Discharge" name="portOfDischarge">
              <Input placeholder="e.g. USLAX" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="No. of Packages" name="packages">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Gross Weight (kg)" name="grossWeight">
              <InputNumber min={0} precision={3} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="CBM" name="cbm">
              <InputNumber min={0} precision={4} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item label="Freight Terms" name="freightTerms">
            <Select options={[
              { value: 'PREPAID', label: 'Prepaid' },
              { value: 'COLLECT', label: 'Collect' },
            ]} placeholder="Select" />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}