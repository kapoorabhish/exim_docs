'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space,
  Popconfirm, Tag, Divider, Upload, Modal, Alert, InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  DownloadOutlined, StopOutlined, SearchOutlined,
} from '@ant-design/icons';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

interface Product {
  id: string;
  sku: string;
  name: string;
  hsCode?: string;
  uomCode: string;
  category?: string;
  bcdRate?: number;
  igstRate?: number;
  isActive: boolean;
}

interface HsCodeResult {
  code: string;
  description: string;
  bcdRate?: number;
  igstRate?: number;
}

export default function ProductsPage() {
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [hsResults, setHsResults] = useState<HsCodeResult[]>([]);
  const [hsLoading, setHsLoading] = useState(false);
  const [uoms, setUoms] = useState<{ code: string; name: string }[]>([]);

  const [importModal, setImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: 20 };
      if (search) params.q = search;
      const { data } = await api.get('/products', { params });
      const payload = data.data || data;
      setProducts(payload.data || payload);
      setTotal(payload.total || (payload.data || payload).length);
    } catch {
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, message]);

  const fetchUoms = useCallback(async () => {
    try {
      const { data } = await api.get('/reference/uoms');
      setUoms((data.data || data).map((u: { code: string; name: string }) => ({ code: u.code, name: u.name })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchUoms(); }, [fetchUoms]);

  const searchHsCodes = async (q: string) => {
    if (!q || q.length < 2) return;
    setHsLoading(true);
    try {
      const { data } = await api.get('/reference/hs-codes', { params: { q } });
      setHsResults((data.data || data).slice(0, 10));
    } catch { /* silent */ }
    finally { setHsLoading(false); }
  };

  const onHsCodeSelect = (code: string) => {
    const entry = hsResults.find((r) => r.code === code);
    if (entry) {
      form.setFieldsValue({
        hsCode: entry.code,
        bcdRate: entry.bcdRate ?? undefined,
        igstRate: entry.igstRate ?? undefined,
      });
    }
  };

  const openDrawer = (product?: Product) => {
    setEditing(product || null);
    setHsResults([]);
    form.resetFields();
    if (product) form.setFieldsValue(product);
    setDrawerOpen(true);
  };

  const onSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, values);
        message.success('Product updated');
      } else {
        await api.post('/products', values);
        message.success('Product created');
      }
      setDrawerOpen(false);
      fetchProducts();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async (id: string) => {
    try {
      await api.put(`/products/${id}/deactivate`);
      message.success('Product deactivated');
      fetchProducts();
    } catch {
      message.error('Failed to deactivate');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deleted');
      fetchProducts();
    } catch {
      message.error('Failed to delete');
    }
  };

  const downloadTemplate = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/products/import/template`, '_blank');
  };

  const onImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = data.data || data;
      setImportResult(result);
      if (result.created > 0) fetchProducts();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
    return false;
  };

  const columns: ColumnsType<Product> = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {r.hsCode && <span style={{ fontSize: 12, color: '#888' }}>HS: {r.hsCode}</span>}
        </Space>
      ),
    },
    { title: 'UOM', dataIndex: 'uomCode', key: 'uomCode', width: 80 },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    {
      title: 'BCD %',
      dataIndex: 'bcdRate',
      key: 'bcdRate',
      width: 80,
      render: (v) => v != null ? `${v}%` : '—',
    },
    {
      title: 'IGST %',
      dataIndex: 'igstRate',
      key: 'igstRate',
      width: 80,
      render: (v) => v != null ? `${v}%` : '—',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(record)} aria-label="Edit" />
          {record.isActive && (
            <Popconfirm title="Deactivate this product?" onConfirm={() => onDeactivate(record.id)}>
              <Button size="small" icon={<StopOutlined />} aria-label="Deactivate" />
            </Popconfirm>
          )}
          <Popconfirm title="Delete this product?" onConfirm={() => onDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Products' }]}
        actions={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>CSV Template</Button>
            <Button icon={<UploadOutlined />} onClick={() => { setImportModal(true); setImportResult(null); }}>
              Import CSV
            </Button>
            <Button intent="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              Add Product
            </Button>
          </Space>
        }
      />

      <Card>
        <Input.Search
          placeholder="Search by name, SKU, or HS code..."
          allowClear
          style={{ width: 320, marginBottom: 16 }}
          onSearch={(v) => { setSearch(v); setPage(1); }}
        />

        <Table
          dataSource={products}
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
        title={editing ? `Edit Product: ${editing.sku}` : 'Add Product'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button intent="primary" loading={saving} onClick={() => form.submit()}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Divider orientation="left" orientationMargin={0}>Basic Info</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="SKU / Product Code" name="sku" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="e.g. PROD-001" />
            </Form.Item>
            <Form.Item label="Category" name="category" style={{ flex: 1 }}>
              <Input placeholder="e.g. Textiles" />
            </Form.Item>
          </Space>
          <Form.Item label="Product Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Cotton Fabric 100gsm" />
          </Form.Item>
          <Form.Item label="Country of Origin" name="countryOfOrigin">
            <Input placeholder="ISO 2-letter code, e.g. IN" />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>HS Code</Divider>
          <Form.Item label="HS Code" name="hsCode" extra="Search by code or keyword to auto-fill duty rates">
            <Select
              showSearch
              placeholder="Search HS code..."
              filterOption={false}
              onSearch={searchHsCodes}
              onSelect={onHsCodeSelect}
              loading={hsLoading}
              suffixIcon={<SearchOutlined />}
              options={hsResults.map((r) => ({
                value: r.code,
                label: `${r.code} — ${r.description.substring(0, 60)}`,
              }))}
            />
          </Form.Item>
          <Form.Item label="Customs Description" name="customsDescription">
            <Input.TextArea rows={2} placeholder="Detailed description for customs" />
          </Form.Item>

          <Divider orientation="left" orientationMargin={0}>Unit & Weight</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Unit of Measurement" name="uomCode" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select
                placeholder="Select UOM"
                options={uoms.map((u) => ({ value: u.code, label: `${u.code} — ${u.name}` }))}
              />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Net Weight / Unit (kg)" name="netWeightPerUnit" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="0.000" step={0.001} min={0} />
            </Form.Item>
            <Form.Item label="Gross Weight / Unit (kg)" name="grossWeightPerUnit" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="0.000" step={0.001} min={0} />
            </Form.Item>
          </Space>

          <Divider orientation="left" orientationMargin={0}>Duty Rates</Divider>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="BCD %" name="bcdRate" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="e.g. 10" min={0} max={100} step={0.5} />
            </Form.Item>
            <Form.Item label="IGST %" name="igstRate" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="e.g. 18" min={0} max={100} step={0.5} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="GST HSN Code" name="gstHsnCode" style={{ flex: 1 }}>
              <Input placeholder="Domestic GST HSN" />
            </Form.Item>
            <Form.Item label="GST Rate %" name="gstRate" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="e.g. 18" min={0} max={28} step={0.5} />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>

      {/* Import CSV Modal */}
      <Modal
        title="Import Products from CSV"
        open={importModal}
        onCancel={() => setImportModal(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate} block>
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