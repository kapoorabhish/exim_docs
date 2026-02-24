'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, Divider, Statistic, Row, Col } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface Gstr3bData {
  month: string;
  table31: {
    lut: { taxableValue: number; igst: number; invoiceCount: number };
    withIgst: { taxableValue: number; igst: number; invoiceCount: number };
    total: { taxableValue: number; igst: number };
  };
  table4: {
    itcFromImports: number;
    boeCount: number;
  };
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = dayjs().subtract(i, 'month');
  return { value: d.format('YYYY-MM'), label: d.format('MMM YYYY') };
});

const fmtInr = (v: number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function Gstr3bPage() {
  const { message } = App.useApp();
  const [month, setMonth] = useState(dayjs().subtract(1, 'month').format('YYYY-MM'));
  const [data, setData] = useState<Gstr3bData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/gst/gstr3b', { params: { month } });
      setData(res.data || res);
    } catch {
      message.error('Failed to load GSTR-3B data');
    } finally {
      setLoading(false);
    }
  }, [month, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `GSTR3B_${month}.json`;
    a.click();
  };

  const table31Rows = data ? [
    { key: 'lut', category: 'Zero-rated (under LUT)', ...data.table31.lut },
    { key: 'igst', category: 'Zero-rated (with IGST payment)', ...data.table31.withIgst },
    { key: 'total', category: 'Total (3.1)', taxableValue: data.table31.total.taxableValue, igst: data.table31.total.igst, invoiceCount: data.table31.lut.invoiceCount + data.table31.withIgst.invoiceCount },
  ] : [];

  const table31Columns = [
    { title: 'Category', dataIndex: 'category', key: 'category', render: (v: string, r: any) => r.key === 'total' ? <strong>{v}</strong> : v },
    { title: 'Invoices', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'right' as const },
    { title: 'Taxable Value (₹)', dataIndex: 'taxableValue', key: 'taxableValue', align: 'right' as const, render: (v: number) => fmtInr(v) },
    { title: 'IGST (₹)', dataIndex: 'igst', key: 'igst', align: 'right' as const, render: (v: number) => fmtInr(v) },
  ];

  return (
    <>
      <PageHeader
        title="GSTR-3B Data"
        breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'GSTR-3B Data' }]}
        actions={
          <Button intent="finance" icon={<DownloadOutlined />} onClick={downloadJson} disabled={!data}>
            Export JSON
          </Button>
        }
      />

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card>
          <Select
            value={month}
            onChange={(v) => setMonth(v)}
            options={MONTHS}
            style={{ width: 160 }}
          />
        </Card>

        <Card title="Table 3.1 — Outward Taxable Supplies (Zero-rated Exports)" loading={loading}>
          <Table
            dataSource={table31Rows}
            columns={table31Columns}
            rowKey="key"
            pagination={false}
            rowClassName={(r) => r.key === 'total' ? 'ant-table-row-selected' : ''}
            locale={{
              emptyText: (
                <EmptyState
                  type="no-results"
                  title="No data"
                  description={`No finalized invoices for ${dayjs(month).format('MMM YYYY')}.`}
                />
              ),
            }}
          />
        </Card>

        <Card title="Table 4 — Eligible ITC (Imports)" loading={loading}>
          {data ? (
            <Row gutter={32}>
              <Col>
                <Statistic title="ITC from Imports (₹)" value={fmtInr(data.table4.itcFromImports)} />
              </Col>
              <Col>
                <Statistic title="BoE Count" value={data.table4.boeCount} />
              </Col>
            </Row>
          ) : (
            <Divider plain>Loading…</Divider>
          )}
        </Card>
      </Space>
    </>
  );
}