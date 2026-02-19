'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App, Card, Table, Tag, Modal, Form, Input, InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SyncOutlined, EditOutlined } from '@ant-design/icons';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

interface ExchangeRate {
  id: string;
  currencyCode: string;
  rate: number;
  rateType: string;
  date: string;
  source?: string;
  updatedAt?: string;
}

export default function ExchangeRatesPage() {
  const { message } = App.useApp();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [overrideModal, setOverrideModal] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [form] = Form.useForm();

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/exchange-rates');
      setRates(data.data || data);
    } catch {
      message.error('Failed to load exchange rates');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const syncRates = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/exchange-rates/sync');
      const result = data.data || data;
      message.success(`Synced ${result.synced} rates (${result.currencies?.join(', ')})`);
      fetchRates();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const openOverride = (currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    form.resetFields();
    form.setFieldsValue({ currencyCode, date: todayIso(), rateType: 'MANUAL' });
    setOverrideModal(true);
  };

  const onOverride = async (values: Record<string, unknown>) => {
    setOverriding(true);
    try {
      await api.put('/exchange-rates/manual', { ...values });
      message.success('Rate overridden');
      setOverrideModal(false);
      fetchRates();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to override rate');
    } finally {
      setOverriding(false);
    }
  };

  const columns: ColumnsType<ExchangeRate> = [
    {
      title: 'Currency',
      dataIndex: 'currencyCode',
      key: 'currencyCode',
      render: (code) => <strong>{code}</strong>,
      sorter: (a, b) => a.currencyCode.localeCompare(b.currencyCode),
    },
    {
      title: 'Rate (1 unit = ? INR)',
      dataIndex: 'rate',
      key: 'rate',
      render: (r) => `₹ ${Number(r).toFixed(4)}`,
    },
    {
      title: 'Type',
      dataIndex: 'rateType',
      key: 'rateType',
      render: (t) => (
        <Tag color={t === 'RBI' ? 'blue' : t === 'MANUAL' ? 'orange' : 'default'}>{t}</Tag>
      ),
    },
    {
      title: 'Effective Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => formatDate(d),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (s) => s || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openOverride(record.currencyCode)}>
          Override
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Exchange Rates"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Exchange Rates' }]}
        actions={
          <Button
            intent="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={syncRates}
          >
            Sync RBI Rates
          </Button>
        }
      />

      <Card>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
          Auto-sync covers ECB-tracked currencies (USD, EUR, GBP, JPY, SGD, AUD, CAD, CHF, CNY, HKD).
          GCC currencies (AED, SAR, OMR, KWD, QAR) must be overridden manually.
        </p>
        <Table
          dataSource={rates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* Manual Override Modal */}
      <Modal
        title={`Override Rate — ${selectedCurrency} / INR`}
        open={overrideModal}
        onCancel={() => setOverrideModal(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onOverride}>
          <Form.Item label="Currency Code" name="currencyCode" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item label="Effective Date" name="date" rules={[{ required: true }]}>
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Rate (1 unit of currency = ? INR)"
            name="rate"
            rules={[{ required: true, type: 'number', min: 0.0001 }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="e.g. 83.50" step={0.01} min={0.0001} />
          </Form.Item>
          <Form.Item label="Source / Note" name="source">
            <Input placeholder="e.g. Bank rate" />
          </Form.Item>
          <Form.Item name="rateType" hidden>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button intent="primary" htmlType="submit" loading={overriding} block>
              Save Override
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}