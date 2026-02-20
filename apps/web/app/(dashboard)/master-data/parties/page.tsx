'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  Popconfirm, Tag, Divider, Upload, Modal, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  DownloadOutlined, StopOutlined,
} from '@ant-design/icons';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

interface Party {
  id: string;
  type: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  name: string;
  country: string;
  city?: string;
  gstin?: string;
  iecNumber?: string;
  defaultIncoterm?: string;
  defaultPaymentTerms?: string;
  isActive: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  CUSTOMER: 'blue',
  VENDOR: 'orange',
  BOTH: 'purple',
};

export default function PartiesPage() {
  const { message } = App.useApp();
  const [parties, setParties] = useState<Party[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [importModal, setImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: 20 };
      if (search) params.q = search;
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/parties', { params });
      const payload = data.data || data;
      setParties(payload.data || payload);
      setTotal(payload.total || (payload.data || payload).length);
    } catch {
      message.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, message]);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  const openDrawer = (party?: Party) => {
    setEditing(party || null);
    form.resetFields();
    if (party) form.setFieldsValue(party);
    setDrawerOpen(true);
  };

  const onSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/parties/${editing.id}`, values);
        message.success('Party updated');
      } else {
        await api.post('/parties', values);
        message.success('Party created');
      }
      setDrawerOpen(false);
      fetchParties();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async (id: string) => {
    try {
      await api.put(`/parties/${id}/deactivate`);
      message.success('Party deactivated');
      fetchParties();
    } catch {
      message.error('Failed to deactivate');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/parties/${id}`);
      message.success('Party deleted');
      fetchParties();
    } catch {
      message.error('Failed to delete');
    }
  };

  const downloadTemplate = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/parties/import/template`, '_blank');
  };

  const onImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/parties/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = data.data || data;
      setImportResult(result);
      if (result.created > 0) fetchParties();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
    return false; // prevent antd auto-upload
  };

  const columns: ColumnsType<Party> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {r.gstin && <span style={{ fontSize: 12, color: '#888' }}>GSTIN: {r.gstin}</span>}
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t) => <Tag color={TYPE_COLORS[t]}>{t}</Tag>,
    },
    { title: 'Country', dataIndex: 'country', key: 'country' },
    { title: 'City', dataIndex: 'city', key: 'city' },
    { title: 'Incoterm', dataIndex: 'defaultIncoterm', key: 'defaultIncoterm' },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" intent="default" icon={<EditOutlined />} onClick={() => openDrawer(record)} aria-label="Edit" />
          {record.isActive && (
            <Popconfirm title="Deactivate this party?" onConfirm={() => onDeactivate(record.id)}>
              <Button size="small" intent="default" icon={<StopOutlined />} aria-label="Deactivate" />
            </Popconfirm>
          )}
          <Popconfirm title="Delete this party?" onConfirm={() => onDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Parties"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Parties' }]}
        actions={
          <Space>
            <Button intent="default" icon={<DownloadOutlined />} onClick={downloadTemplate}>CSV Template</Button>
            <Button intent="default" icon={<UploadOutlined />} onClick={() => { setImportModal(true); setImportResult(null); }}>
              Import CSV
            </Button>
            <Button intent="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              Add Party
            </Button>
          </Space>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by name, country, tax ID..."
            allowClear
            style={{ width: 320 }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
          />
          <Select
            placeholder="Filter by type"
            allowClear
            style={{ width: 160 }}
            onChange={(v) => { setTypeFilter(v || ''); setPage(1); }}
            options={[
              { value: 'CUSTOMER', label: 'Customer' },
              { value: 'VENDOR', label: 'Vendor' },
              { value: 'BOTH', label: 'Both' },
            ]}
          />
        </Space>

        <Table
          dataSource={parties}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* Add / Edit Drawer */}
      <Drawer
        title={editing ? `Edit Party: ${editing.name}` : 'Add Party'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button intent="default" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button intent="primary" loading={saving} onClick={() => form.submit()}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Divider orientation="left" orientationMargin={0}>Basic Info</Divider>
          <Form.Item label="Party Type" name="type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'CUSTOMER', label: 'Customer (Buyer)' },
              { value: 'VENDOR', label: 'Vendor (Supplier)' },
              { value: 'BOTH', label: 'Both' },
            ]} />
          </Form.Item>
          <Form.Item label="Company Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Acme Corp" />
          </Form.Item>
          <Form.Item label="Country" name="country" rules={[{ required: true }]}>
            <Input placeholder="ISO 2-letter code, e.g. US" />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} placeholder="Street address" />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="City" name="city" style={{ flex: 1 }}>
              <Input placeholder="City" />
            </Form.Item>
            <Form.Item label="State / Province" name="state" style={{ flex: 1 }}>
              <Input placeholder="State" />
            </Form.Item>
            <Form.Item label="ZIP / Postal" name="zip" style={{ flex: 1 }}>
              <Input placeholder="ZIP" />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Tax Identifiers</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="GSTIN" name="gstin" style={{ flex: 1 }}>
              <Input placeholder="27AABCU9603R1ZX" />
            </Form.Item>
            <Form.Item label="IEC Number" name="iecNumber" style={{ flex: 1 }}>
              <Input placeholder="IEC (Indian exporters)" />
            </Form.Item>
          </Space>
          <Form.Item label="VAT / TIN / EIN" name="vatNumber">
            <Input placeholder="Foreign tax ID" />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Bank Details</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Bank Name" name="bankName" style={{ flex: 1 }}>
              <Input placeholder="e.g. HDFC Bank" />
            </Form.Item>
            <Form.Item label="SWIFT Code" name="swiftCode" style={{ flex: 1 }}>
              <Input placeholder="e.g. HDFCINBB" />
            </Form.Item>
          </Space>
          <Form.Item label="Account Number / IBAN" name="accountNumber">
            <Input placeholder="Account or IBAN" />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Trade Terms</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Default Incoterm" name="defaultIncoterm" style={{ flex: 1 }}>
              <Input placeholder="e.g. FOB" />
            </Form.Item>
            <Form.Item label="Payment Terms" name="defaultPaymentTerms" style={{ flex: 1 }}>
              <Input placeholder="e.g. NET30" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Credit Limit" name="creditLimit" style={{ flex: 1 }}>
              <Input type="number" placeholder="e.g. 50000" />
            </Form.Item>
            <Form.Item label="Preferred Port Code" name="preferredPortCode" style={{ flex: 1 }}>
              <Input placeholder="e.g. INMAA" />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>

      {/* Import CSV Modal */}
      <Modal
        title="Import Parties from CSV"
        open={importModal}
        onCancel={() => setImportModal(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button intent="default" icon={<DownloadOutlined />} onClick={downloadTemplate} block>
            Download CSV Template first
          </Button>
          <Upload.Dragger
            accept=".csv"
            showUploadList={false}
            beforeUpload={(file) => { onImport(file as File); return false; }}
            disabled={importing}
          >
            <p className="ant-upload-drag-icon"><UploadOutlined /></p>
            <p>{importing ? 'Importing...' : 'Click or drag CSV file here to upload'}</p>
          </Upload.Dragger>
          {importResult && (
            <Alert
              type={importResult.errors.length ? 'warning' : 'success'}
              message={`Import complete: ${importResult.created} created, ${importResult.skipped} skipped`}
              description={
                importResult.errors.length
                  ? importResult.errors.slice(0, 5).join('\n')
                  : undefined
              }
              showIcon
            />
          )}
        </Space>
      </Modal>
    </>
  );
}