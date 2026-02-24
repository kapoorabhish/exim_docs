'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Space, Tag, Popconfirm, Select, Calendar, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { PageHeader, Button, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface AgingRow {
  invoiceId: string;
  invoiceNumber: string;
  buyerName: string;
  currency: string;
  totalAmount: number;
  date: string;
  ageBucket: 'CURRENT' | '1_30' | '31_60' | '61_90' | '90_PLUS';
  daysOutstanding: number;
}

interface CalendarEvent {
  invoiceId: string;
  invoiceNumber: string;
  buyerName: string;
  date: string;
  amount: number;
  currency: string;
}

const BUCKET_COLOR: Record<string, string> = {
  CURRENT: 'green',
  '1_30': 'cyan',
  '31_60': 'orange',
  '61_90': 'volcano',
  '90_PLUS': 'red',
};

const BUCKET_LABEL: Record<string, string> = {
  CURRENT: 'Current',
  '1_30': '1–30 days',
  '31_60': '31–60 days',
  '61_90': '61–90 days',
  '90_PLUS': '90+ days',
};

export default function RemindersPage() {
  const { message } = App.useApp();
  const [agingRows, setAgingRows] = useState<AgingRow[]>([]);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [bucketFilter, setBucketFilter] = useState('');
  const [calMonth, setCalMonth] = useState(dayjs().format('YYYY-MM'));

  const fetchAging = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (bucketFilter) params.bucket = bucketFilter;
      const { data } = await api.get('/payments/reminders/aging', { params });
      const payload = data.data || data;
      setAgingRows(Array.isArray(payload) ? payload : payload.data || []);
    } catch {
      message.error('Failed to load aging report');
    } finally {
      setLoading(false);
    }
  }, [bucketFilter, message]);

  const fetchCalendar = useCallback(async () => {
    try {
      const { data } = await api.get('/payments/reminders/calendar', { params: { month: calMonth } });
      const payload = data.data || data;
      setCalEvents(Array.isArray(payload) ? payload : payload.data || []);
    } catch {
      // non-critical
    }
  }, [calMonth]);

  useEffect(() => { fetchAging(); }, [fetchAging]);
  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const sendReminder = async (invoiceId: string, invoiceNumber: string) => {
    try {
      await api.post(`/payments/reminders/${invoiceId}/send`);
      message.success(`Reminder logged for ${invoiceNumber}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to send reminder');
    }
  };

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const events = calEvents.filter((e) => dayjs(e.date).format('YYYY-MM-DD') === dateStr);
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {events.slice(0, 2).map((e) => (
          <li key={e.invoiceId}>
            <Badge status="warning" text={<span style={{ fontSize: 11 }}>{e.invoiceNumber}</span>} />
          </li>
        ))}
        {events.length > 2 && <li style={{ fontSize: 11, color: '#999' }}>+{events.length - 2} more</li>}
      </ul>
    );
  };

  const columns: ColumnsType<AgingRow> = [
    { title: 'Invoice No.', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName' },
    { title: 'Invoice Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Amount', key: 'amount', align: 'right', render: (_, r) => `${r.currency} ${Number(r.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Days Outstanding', dataIndex: 'daysOutstanding', key: 'daysOutstanding', align: 'center', render: (v) => <span style={{ color: v > 60 ? 'red' : v > 30 ? 'orange' : 'inherit' }}>{v}</span> },
    {
      title: 'Age Bucket',
      dataIndex: 'ageBucket',
      key: 'ageBucket',
      render: (v) => <Tag color={BUCKET_COLOR[v]}>{BUCKET_LABEL[v]}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => (
        <Popconfirm title={`Send payment reminder to buyer for ${r.invoiceNumber}?`} onConfirm={() => sendReminder(r.invoiceId, r.invoiceNumber)}>
          <Button size="small" intent="finance" icon={<BellOutlined />}>
            Send Reminder
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Payment Reminders"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Reminders' }]}
      />

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card title="Invoice Calendar">
          <Calendar
            mode="month"
            cellRender={dateCellRender}
            onPanelChange={(date) => setCalMonth(date.format('YYYY-MM'))}
            style={{ maxHeight: 400, overflow: 'hidden' }}
          />
        </Card>

        <Card title="Aging Report">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Filter by age bucket"
              allowClear
              style={{ width: 200 }}
              onChange={(v) => setBucketFilter(v || '')}
              options={Object.entries(BUCKET_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Space>
          <Table
            dataSource={agingRows}
            columns={columns}
            rowKey="invoiceId"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            locale={{
              emptyText: (
                <EmptyState
                  type={bucketFilter ? 'no-results' : 'no-data'}
                  title={bucketFilter ? 'No invoices in this bucket' : 'All invoices are current'}
                  description={bucketFilter ? 'Try clearing the filter.' : 'No overdue receivables at this time.'}
                />
              ),
            }}
          />
        </Card>
      </Space>
    </>
  );
}