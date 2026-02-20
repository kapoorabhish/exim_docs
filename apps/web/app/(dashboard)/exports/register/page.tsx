'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Space, Select, DatePicker, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

interface RegisterRow {
  id: string;
  invoiceNumber: string;
  date: string;
  currency: string;
  totalAmount: number;
  exchangeRate: number;
  totalAmountInr?: number;
  incoterm?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  buyer: { name: string; country?: string };
  status: string;
  shippingBills: { sbNumber?: string; status: string; totalFobInr?: number }[];
  bankRealizationCertificates: { status: string; foreignAmount?: number; inrAmount?: number }[];
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', FINALIZED: 'blue', LOCKED: 'purple',
};

const BRC_STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange', RECEIVED: 'green',
};

export default function ExportRegisterPage() {
  const { message } = App.useApp();
  const [records, setRecords] = useState<RegisterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString();
      if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString();
      const { data } = await api.get('/invoices/register', { params });
      const payload = data.data || data;
      setRecords(Array.isArray(payload) ? payload : payload.data || []);
      setTotal(payload.total || (Array.isArray(payload) ? payload.length : 0));
    } catch {
      message.error('Failed to load export register');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateRange, message]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const exportCsv = () => {
    if (!records.length) return;

    const headers = [
      'Invoice No.', 'Date', 'Buyer', 'Country', 'Currency', 'FOB Value',
      'Exchange Rate', 'INR Equiv.', 'Incoterm', 'Port of Loading', 'Port of Discharge',
      'Status', 'SB Number', 'SB Status', 'FOB INR (SB)', 'BRC Status', 'BRC Amount',
    ];

    const rows = records.map((r) => {
      const sb = r.shippingBills?.[0];
      const brc = r.bankRealizationCertificates?.[0];
      const inrEquiv = r.totalAmountInr ?? (Number(r.totalAmount) * Number(r.exchangeRate));
      return [
        r.invoiceNumber,
        dayjs(r.date).format('DD/MM/YYYY'),
        r.buyer?.name ?? '',
        r.buyer?.country ?? '',
        r.currency,
        Number(r.totalAmount).toFixed(2),
        Number(r.exchangeRate).toFixed(4),
        inrEquiv.toFixed(2),
        r.incoterm ?? '',
        r.portOfLoading ?? '',
        r.portOfDischarge ?? '',
        r.status,
        sb?.sbNumber ?? '',
        sb?.status ?? '',
        sb?.totalFobInr != null ? Number(sb.totalFobInr).toFixed(2) : '',
        brc?.status ?? '',
        brc?.foreignAmount != null ? Number(brc.foreignAmount).toFixed(2) : '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-register-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns: ColumnsType<RegisterRow> = [
    {
      title: 'Invoice No.',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      fixed: 'left',
      width: 140,
      render: (n) => <span style={{ fontWeight: 500 }}>{n}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (d) => dayjs(d).format('DD MMM YYYY'),
    },
    {
      title: 'Buyer',
      key: 'buyer',
      width: 160,
      render: (_, r) => (
        <Tooltip title={r.buyer?.country}>
          {r.buyer?.name}
        </Tooltip>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 80,
    },
    {
      title: 'FOB Value',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 120,
      render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'INR Equiv.',
      key: 'inr',
      align: 'right',
      width: 120,
      render: (_, r) => {
        const inr = r.totalAmountInr ?? (Number(r.totalAmount) * Number(r.exchangeRate));
        return `₹${inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      },
    },
    {
      title: 'Incoterm',
      dataIndex: 'incoterm',
      key: 'incoterm',
      width: 80,
      render: (v) => v || '—',
    },
    {
      title: 'Port of Loading',
      dataIndex: 'portOfLoading',
      key: 'pol',
      width: 120,
      render: (v) => v || '—',
    },
    {
      title: 'Invoice Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
    },
    {
      title: 'SB No.',
      key: 'sb',
      width: 130,
      render: (_, r) => {
        const sb = r.shippingBills?.[0];
        if (!sb) return <span style={{ color: '#aaa' }}>—</span>;
        return (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 500 }}>{sb.sbNumber || 'Pending'}</span>
            <Tag style={{ marginTop: 2 }}>{sb.status}</Tag>
          </Space>
        );
      },
    },
    {
      title: 'SB FOB (INR)',
      key: 'sbFob',
      align: 'right',
      width: 120,
      render: (_, r) => {
        const sb = r.shippingBills?.[0];
        if (!sb?.totalFobInr) return '—';
        return `₹${Number(sb.totalFobInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      },
    },
    {
      title: 'BRC',
      key: 'brc',
      width: 100,
      render: (_, r) => {
        const brc = r.bankRealizationCertificates?.[0];
        if (!brc) return <Tag color="default">Not Filed</Tag>;
        return <Tag color={BRC_STATUS_COLOR[brc.status]}>{brc.status}</Tag>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Export Register"
        breadcrumbs={[{ label: 'Exports' }, { label: 'Export Register' }]}
        actions={
          <Button intent="default" icon={<DownloadOutlined />} onClick={exportCsv} disabled={!records.length}>
            Export CSV
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'FINALIZED', label: 'Finalized' },
              { value: 'LOCKED', label: 'Locked' },
            ]}
          />
          <DatePicker.RangePicker
            onChange={(dates) => { setDateRange(dates as [Dayjs | null, Dayjs | null]); setPage(1); }}
            format="DD MMM YYYY"
          />
        </Space>

        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ current: page, pageSize: 50, total, onChange: setPage, showSizeChanger: false }}
          summary={(pageData) => {
            const totalFob = pageData.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
            const totalInr = pageData.reduce((s, r) => {
              const inr = r.totalAmountInr ?? (Number(r.totalAmount) * Number(r.exchangeRate));
              return s + inr;
            }, 0);
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#f9fafb', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0} colSpan={4}>Page Total ({pageData.length} invoices)</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    {pageData[0]?.currency} {totalFob.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    ₹{totalInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} colSpan={7} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </>
  );
}