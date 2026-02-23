'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

const { Text } = Typography;

interface ReceivableRow {
  invoiceId: string; invoiceNumber: string;
  buyer: { id: string; name: string };
  invoiceDate: string; currency: string;
  totalAmount: number; paid: number; outstanding: number;
}

interface Summary { totalOutstanding: number; count: number }

export default function ReceivablesPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<ReceivableRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [buyerFilter, setBuyerFilter] = useState('');

  const fetchParties = useCallback(async () => {
    try {
      const { data } = await api.get('/parties', { params: { type: 'CUSTOMER', limit: 200 } });
      const p = data.data || data; setParties(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 30 };
      if (buyerFilter) params.buyerPartyId = buyerFilter;
      const { data } = await api.get('/export-payments/outstanding-receivables', { params });
      const p = data.data || data;
      setRecords(p.data || []);
      setSummary(p.summary || null);
      setTotal(p.total || 0);
    } catch { message.error('Failed to load receivables'); }
    finally { setLoading(false); }
  }, [page, buyerFilter, message]);

  useEffect(() => { fetchRecords(); fetchParties(); }, [fetchRecords, fetchParties]);

  const columns: ColumnsType<ReceivableRow> = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (n) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: 'Buyer', dataIndex: ['buyer', 'name'], key: 'buyer' },
    { title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center' },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'total', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Paid', dataIndex: 'paid', key: 'paid', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    {
      title: 'Outstanding', dataIndex: 'outstanding', key: 'outstanding', align: 'right',
      render: (v, r) => <Text strong style={{ color: v > 0 ? '#dc2626' : '#16a34a' }}>{r.currency} {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>,
    },
  ];

  const hasFilters = !!buyerFilter;

  return (
    <>
      <PageHeader
        title="Outstanding Receivables"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Receivables' }]}
      />

      {summary && (
        <Card style={{ marginBottom: 16 }}>
          <Space size="large">
            <span>Total Outstanding: <Text strong style={{ color: '#dc2626' }}>₹ {summary.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></span>
            <span>Invoices: <Text strong>{summary.count}</Text></span>
          </Space>
        </Card>
      )}

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by buyer"
            allowClear
            showSearch
            style={{ width: 240 }}
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={parties.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => { setBuyerFilter(v || ''); setPage(1); }}
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
              : <EmptyState type="no-data" title="No outstanding receivables" description="All export invoices are fully collected." />,
          }}
        />
      </Card>
    </>
  );
}