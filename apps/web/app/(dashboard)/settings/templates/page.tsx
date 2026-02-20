'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Drawer, Form, Input, Select, Space, Popconfirm, Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined } from '@ant-design/icons';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

interface TermsTemplate {
  id: string;
  name: string;
  documentType: string;
  content: string;
  isDefault: boolean;
  version: number;
  updatedAt: string;
}

const DOC_TYPE_OPTIONS = [
  { value: 'INVOICE', label: 'Commercial Invoice' },
  { value: 'PROFORMA', label: 'Proforma Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'PACKING_LIST', label: 'Packing List' },
  { value: 'SHIPPING_BILL', label: 'Shipping Bill' },
  { value: 'GENERAL', label: 'General' },
];

export default function TemplatesPage() {
  const { message } = App.useApp();
  const [templates, setTemplates] = useState<TermsTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TermsTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/terms-templates');
      setTemplates(data.data || data);
    } catch {
      message.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openDrawer = (template?: TermsTemplate) => {
    setEditing(template || null);
    form.resetFields();
    if (template) form.setFieldsValue(template);
    setDrawerOpen(true);
  };

  const onSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/terms-templates/${editing.id}`, values);
        message.success('Template updated');
      } else {
        await api.post('/terms-templates', values);
        message.success('Template created');
      }
      setDrawerOpen(false);
      fetchTemplates();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onSetDefault = async (id: string) => {
    try {
      await api.put(`/terms-templates/${id}/default`);
      message.success('Set as default');
      fetchTemplates();
    } catch {
      message.error('Failed to set default');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/terms-templates/${id}`);
      message.success('Template deleted');
      fetchTemplates();
    } catch {
      message.error('Failed to delete');
    }
  };

  const columns: ColumnsType<TermsTemplate> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => (
        <Space>
          {name}
          {r.isDefault && <Tag color="gold">Default</Tag>}
        </Space>
      ),
    },
    {
      title: 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (t) => {
        const opt = DOC_TYPE_OPTIONS.find((o) => o.value === t);
        return <Tag>{opt?.label || t}</Tag>;
      },
    },
    { title: 'Version', dataIndex: 'version', key: 'version', width: 80 },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (d) => new Date(d).toLocaleDateString('en-IN'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" intent="default" icon={<EditOutlined />} onClick={() => openDrawer(record)} aria-label="Edit" />
          {!record.isDefault && (
            <Button size="small" intent="default" icon={<StarOutlined />} onClick={() => onSetDefault(record.id)} aria-label="Set default" />
          )}
          <Popconfirm title="Delete this template?" onConfirm={() => onDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Terms & Conditions Templates"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Templates' }]}
        actions={
          <Button intent="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            New Template
          </Button>
        }
      />

      <Card>
        <Table
          dataSource={templates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Drawer
        title={editing ? `Edit Template: ${editing.name}` : 'New Template'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
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
          <Form.Item label="Template Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Standard Export Terms" />
          </Form.Item>
          <Form.Item label="Document Type" name="documentType" rules={[{ required: true }]}>
            <Select options={DOC_TYPE_OPTIONS} placeholder="Select document type" />
          </Form.Item>
          <Form.Item label="Content" name="content" rules={[{ required: true }]}>
            <Input.TextArea
              rows={12}
              placeholder="Enter your terms and conditions text here..."
            />
          </Form.Item>
          <Form.Item label="Set as Default for this Document Type" name="isDefault">
            <Select
              options={[
                { value: false, label: 'No' },
                { value: true, label: 'Yes — set as default' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}