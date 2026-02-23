'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

const { Text } = Typography;

interface PayableRow {
  invoiceId: string; invoiceNumber: string;
  supplier: { id: string; name: string };
  invoiceDate: string; dueDate?: string; currency: string;
  totalAmount: number; outstanding: number; daysOverdue: number; ageBucket: string;
}

const BUCKET_COLOR: Record<string, string> = { Current: 'green', '1-30': 'gold', '31-60': 'orange', '61-90': 'red', '90+': '#7f1d1d' };

export default function PayablesPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<PayableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [bucketFilter, setBucketFilter] = useState('');

  const fetchParties = useCallback(async () => {
    try {
      const { data } = await api.get('/parties', { params: { type: 'VENDOR', limit: 200 } });
      const p = data.data || data; setParties(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 30 };
      if (supplierFilter) params.supplierPartyId = supplierFilter;
      if (bucketFilter) params.ageBucket = bucketFilter;
      const { data } = await api.get('/import-payments/outstanding-payables', { params });
      const p = data.data || data;
      setRecords(p.data || []);
      setTotal(p.total || 0);
    } catch { message.error('Failed to load payables'); }
    finally { setLoading(false); }
  }, [page, supplierFilter, bucketFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const columns: ColumnsType<PayableRow> = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Supplier', dataIndex: ['supplier', 'name'], key: 'supplier' },
    { title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center' },
    {
      title: 'Outstanding', dataIndex: 'outstanding', key: 'outstanding', align: 'right',
      render: (v, r) => <Text strong style={{ color: v > 0 ? '#dc2626' : '#16a34a' }}>{r.currency} {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>,
    },
    { title: 'Days Overdue', dataIndex: 'daysOverdue', key: 'daysOverdue', align: 'center', render: (v) => v > 0 ? <Text type="danger">{v}d</Text> : '—' },
    {
      title: 'Age', dataIndex: 'ageBucket', key: 'ageBucket',
      render: (b) => <Tag color={BUCKET_COLOR[b] || 'default'}>{b}</Tag>,
    },
  ];

  const hasFilters = !!(supplierFilter || bucketFilter);

  return (
    <>
      <PageHeader
        title="Outstanding Payables"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Payables' }]}
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by supplier"
            allowClear
            showSearch
            style={{ width: 240 }}
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={parties.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => { setSupplierFilter(v || ''); setPage(1); }}
          />
          <Select
            placeholder="Age bucket"
            allowClear
            style={{ width: 160 }}
            onChange={(v) => { setBucketFilter(v || ''); setPage(1); }}
            options={[
              { value: 'Current', label: 'Current' },
              { value: '1-30', label: '1–30 days' },
              { value: '31-60', label: '31–60 days' },
              { value: '61-90', label: '61–90 days' },
              { value: '90+', label: '90+ days' },
            ]}
          />
        </Space>

        <Table
          dataSource={records}
          columns={columns}
          rowKey="invoiceId"
          loading={loading}
          pagination={{ current: page, pageSize: 30, total, onChange: setPage, showSizeChanger: false }}
          locale={{
            emptyText: hasFilters
              ? <EmptyState type="no-results" />
              : <EmptyState type="no-data" title="No outstanding payables" description="All supplier invoices are fully paid." />,
          }}
        />
      </Card>
    </>
  );
}