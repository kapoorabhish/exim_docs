'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import type { DocumentStatusType } from '@exim/shared';
import api from '../../../../lib/api';

const { RangePicker } = DatePicker;

interface RegisterRow {
  id: string;
  poNumber?: string;
  supplierName: string;
  supplierCountry?: string;
  currency: string;
  assessedValue: number;
  boeNumber?: string;
  boeDate?: string;
  totalDuty: number;
  outOfChargeDate?: string;
  status: string;
  invoiceNumber: string;
}

interface RegisterSummary {
  count: number;
  totalAssessedValue: number;
  totalDuty: number;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'FILED', label: 'Filed' },
  { value: 'EXAMINED', label: 'Examined' },
  { value: 'OUT_OF_CHARGE', label: 'Out of Charge' },
  { value: 'DUTY_PAID', label: 'Duty Paid' },
];

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ImportRegisterPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<RegisterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<RegisterSummary>({ count: 0, totalAssessedValue: 0, totalDuty: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [exporting, setExporting] = useState(false);

  const buildParams = useCallback(() => {
    const params: any = { page, pageSize: 20 };
    if (statusFilter) params.status = statusFilter;
    if (dateRange?.[0]) params.dateFrom = dateRange[0].startOf('day').toISOString();
    if (dateRange?.[1]) params.dateTo = dateRange[1].endOf('day').toISOString();
    return params;
  }, [page, statusFilter, dateRange]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bills-of-entry/register', { params: buildParams() });
      const p = data.data || data;
      setRecords(Array.isArray(p) ? p : p.data || []);
      setTotal(p.total || (Array.isArray(p) ? p.length : 0));
      if (p.summary) setSummary(p.summary);
    } catch { message.error('Failed to load import register'); }
    finally { setLoading(false); }
  }, [buildParams, message]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = { ...buildParams(), format: 'csv', page: 1, pageSize: 10000 };
      const { data } = await api.get('/bills-of-entry/register', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-register-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { message.error('Export failed'); }
    finally { setExporting(false); }
  };

  const columns: ColumnsType<RegisterRow> = [
    { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', render: (n) => n || '—' },
    { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName' },
    { title: 'Country', dataIndex: 'supplierCountry', key: 'supplierCountry', render: (c) => c || '—' },
    {
      title: 'CIF Value (INR)', dataIndex: 'assessedValue', key: 'assessedValue', align: 'right',
      render: (v) => `₹${fmt(Number(v))}`,
    },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center' },
    { title: 'BoE Number', dataIndex: 'boeNumber', key: 'boeNumber', render: (n) => n || '—' },
    { title: 'BoE Date', dataIndex: 'boeDate', key: 'boeDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    {
      title: 'Total Duty (INR)', dataIndex: 'totalDuty', key: 'totalDuty', align: 'right',
      render: (v) => `₹${fmt(Number(v))}`,
    },
    { title: 'OOC Date', dataIndex: 'outOfChargeDate', key: 'outOfChargeDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <StatusBadge status={s.toLowerCase() as DocumentStatusType} />,
    },
  ];

  const hasFilters = !!(statusFilter || dateRange);

  return (
    <>
      <PageHeader
        title="Import Register"
        breadcrumbs={[{ label: 'Imports' }, { label: 'Import Register' }]}
        actions={
          <Button
            intent="default"
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        }
      />

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <Card size="small">
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Shipments</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.count}</div>
        </Card>
        <Card size="small">
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total CIF Value (INR)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>₹{fmt(summary.totalAssessedValue)}</div>
        </Card>
        <Card size="small">
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Duty Paid (INR)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>₹{fmt(summary.totalDuty)}</div>
        </Card>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <RangePicker
            onChange={(dates) => { setDateRange(dates as any); setPage(1); }}
            format="DD MMM YYYY"
            placeholder={['From date', 'To date']}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
          />
        </Space>

        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
          locale={{
            emptyText: hasFilters
              ? <EmptyState type="no-results" />
              : <EmptyState type="no-data" title="Import register is empty" description="Bills of entry will appear here once filed." />,
          }}
        />
      </Card>
    </>
  );
}