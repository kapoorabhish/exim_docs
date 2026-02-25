'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Drawer, Form, Input, DatePicker, Space, Popconfirm, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface LutRecord {
  id: string;
  arn: string;
  financialYear: string;
  filingDate: string;
  expiryDate: string;
  status: 'APPLIED' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  notes?: string;
}

function toLower(s: string) {
  return s.toLowerCase() as any;
}

export default function LutPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<LutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/gst/lut');
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
    } catch {
      message.error('Failed to load LUT records');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openDrawer = () => {
    form.resetFields();
    setDrawerOpen(true);
  };

  const onSave = async (values: any) => {
    setSaving(true);
    try {
      await api.post('/gst/lut', {
        ...values,
        filingDate: values.filingDate?.toISOString(),
        expiryDate: values.expiryDate?.toISOString(),
      });
      message.success('LUT record created');
      setDrawerOpen(false);
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create LUT');
    } finally {
      setSaving(false);
    }
  };

  const onActivate = async (id: string) => {
    try {
      await api.put(`/gst/lut/${id}/activate`);
      message.success('LUT activated');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to activate');
    }
  };

  const columns: ColumnsType<LutRecord> = [
    { title: 'ARN', dataIndex: 'arn', key: 'arn', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Financial Year', dataIndex: 'financialYear', key: 'financialYear' },
    { title: 'Filing Date', dataIndex: 'filingDate', key: 'filingDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Expiry Date', dataIndex: 'expiryDate', key: 'expiryDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    {
      title: 'Days Remaining',
      key: 'daysRemaining',
      render: (_, r) => {
        const days = dayjs(r.expiryDate).diff(dayjs(), 'day');
        return (
          <Tag color={days < 0 ? 'red' : days <= 30 ? 'orange' : 'green'}>
            {days < 0 ? `${Math.abs(days)}d expired` : `${days}d`}
          </Tag>
        );
      },
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={toLower(s)} /> },
    {
      title: '',
      key: 'actions',
      render: (_, r) =>
        r.status === 'APPLIED' ? (
          <Popconfirm title="Activate this LUT? Any existing active LUT will be superseded." onConfirm={() => onActivate(r.id)}>
            <Button size="small" intent="finance" icon={<CheckOutlined />}>Activate</Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="LUT Management"
        breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'LUT Management' }]}
        actions={
          <Button intent="finance" icon={<PlusOutlined />} onClick={openDrawer}>
            New LUT
          </Button>
        }
      />

      <Card>
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState
                type="no-data"
                title="No LUT records"
                description="Add your Letter of Undertaking ARN to enable zero-rated exports."
                actionLabel="New LUT"
                onAction={openDrawer}
              />
            ),
          }}
        />
      </Card>

      <Drawer
        title="New LUT Record"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button intent="default" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button intent="finance" loading={saving} onClick={() => form.submit()}>Create</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="ARN (Acknowledgement Reference Number)" name="arn" rules={[{ required: true }]}>
            <Input placeholder="e.g. AD170322001234E" />
          </Form.Item>
          <Form.Item label="Financial Year" name="financialYear" rules={[{ required: true }]}>
            <Input placeholder="e.g. 2025-26" />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Filing Date" name="filingDate" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Expiry Date" name="expiryDate" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}