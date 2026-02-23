'use client';

import React, { useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, DatePicker, Typography, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader, Button, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface LedgerEntry {
  date: string; type: string; reference: string;
  debit: number; credit: number; currency: string; runningBalance: number;
}

interface LedgerResponse {
  party: { id: string; name: string; type: string };
  entries: LedgerEntry[];
  closingBalance: number;
  total: number; page: number; pageSize: number;
}

export default function PartyLedgerPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);

  const fetchParties = useCallback(async () => {
    if (parties.length) return;
    try {
      const { data: d } = await api.get('/parties', { params: { limit: 500 } });
      const p = d.data || d; setParties(Array.isArray(p) ? p : p.data || []);
    } catch { /* silent */ }
  }, [parties]);

  const fetchLedger = useCallback(async (partyId: string, pg = 1) => {
    if (!partyId) return;
    setLoading(true);
    try {
      const params: any = { page: pg, pageSize: 50 };
      if (dateRange?.[0]) params.dateFrom = dateRange[0].toISOString();
      if (dateRange?.[1]) params.dateTo = dateRange[1].toISOString();
      const { data: d } = await api.get(`/payments/party-ledger/${partyId}`, { params });
      setData(d.data || d);
    } catch { message.error('Failed to load ledger'); }
    finally { setLoading(false); }
  }, [dateRange, message]);

  const columns: ColumnsType<LedgerEntry> = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120, render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 160 },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (r) => <span style={{ fontWeight: 500 }}>{r}</span> },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80, align: 'center' },
    {
      title: 'Debit', dataIndex: 'debit', key: 'debit', align: 'right', width: 140,
      render: (v) => v > 0 ? <Text style={{ color: '#dc2626' }}>{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text> : '—',
    },
    {
      title: 'Credit', dataIndex: 'credit', key: 'credit', align: 'right', width: 140,
      render: (v) => v > 0 ? <Text style={{ color: '#16a34a' }}>{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text> : '—',
    },
    {
      title: 'Balance', dataIndex: 'runningBalance', key: 'runningBalance', align: 'right', width: 140,
      render: (v) => <Text strong style={{ color: v >= 0 ? '#1e40af' : '#dc2626' }}>{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Party Ledger"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Party Ledger' }]}
      />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Select party"
            showSearch
            style={{ width: 280 }}
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={parties.map((p) => ({ value: p.id, label: p.name }))}
            onFocus={fetchParties}
            onChange={(v) => { setSelectedParty(v); setPage(1); }}
          />
          <RangePicker
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
          />
          <Button
            intent="default"
            disabled={!selectedParty}
            loading={loading}
            onClick={() => { setPage(1); fetchLedger(selectedParty, 1); }}
          >
            Load Ledger
          </Button>
        </Space>
      </Card>

      {data && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Space size="large">
              <span>Party: <Text strong>{data.party.name}</Text></span>
              <Statistic
                title="Closing Balance"
                value={Math.abs(data.closingBalance)}
                precision={2}
                suffix={data.closingBalance >= 0 ? ' Dr' : ' Cr'}
                valueStyle={{ color: data.closingBalance >= 0 ? '#1e40af' : '#dc2626', fontSize: 16 }}
              />
            </Space>
          </Card>

          <Card>
            <Table
              dataSource={data.entries}
              columns={columns}
              rowKey={(_, i) => String(i)}
              loading={loading}
              pagination={{
                current: page,
                pageSize: 50,
                total: data.total,
                onChange: (pg) => { setPage(pg); fetchLedger(selectedParty, pg); },
                showSizeChanger: false,
              }}
              locale={{
                emptyText: <EmptyState type="no-results" />,
              }}
              size="small"
            />
          </Card>
        </>
      )}

      {!data && !loading && (
        <Card>
          <EmptyState type="no-data" title="Select a party to view ledger" description="Choose a party and optionally set a date range, then click Load Ledger." />
        </Card>
      )}
    </>
  );
}