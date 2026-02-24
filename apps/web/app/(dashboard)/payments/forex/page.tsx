'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, DatePicker, Select, Space, Tag, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { PageHeader, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface ForexRow {
  paymentId: string;
  paymentDate: string;
  invoiceNumber: string;
  buyerName: string;
  currency: string;
  foreignAmount: number;
  invoiceRate: number;
  paymentRate: number;
  gainLossInr: number;
}

interface ForexSummary {
  totalRealizedGain: number;
  totalRealizedLoss: number;
  netGainLoss: number;
  paymentCount: number;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'CHF'];

export default function ForexPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ForexRow[]>([]);
  const [summary, setSummary] = useState<ForexSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [currency, setCurrency] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateRange[0]) params.dateFrom = dateRange[0].format('YYYY-MM-DD');
      if (dateRange[1]) params.dateTo = dateRange[1].format('YYYY-MM-DD');
      if (currency) params.currency = currency;
      const [rowsRes, summaryRes] = await Promise.all([
        api.get('/payments/forex', { params }),
        api.get('/payments/forex/summary', { params }),
      ]);
      const payload = rowsRes.data.data || rowsRes.data;
      setRows(Array.isArray(payload) ? payload : payload.data || []);
      setSummary(summaryRes.data.data || summaryRes.data);
    } catch {
      message.error('Failed to load forex data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, currency, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtInr = (v: number) => {
    const abs = Math.abs(v);
    return (v < 0 ? '−' : '+') + `₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const columns: ColumnsType<ForexRow> = [
    { title: 'Payment Date', dataIndex: 'paymentDate', key: 'paymentDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Invoice No.', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80 },
    {
      title: 'Foreign Amount',
      dataIndex: 'foreignAmount',
      key: 'foreignAmount',
      align: 'right',
      render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Invoice Rate',
      dataIndex: 'invoiceRate',
      key: 'invoiceRate',
      align: 'right',
      render: (v) => `₹${Number(v).toFixed(4)}`,
    },
    {
      title: 'Payment Rate',
      dataIndex: 'paymentRate',
      key: 'paymentRate',
      align: 'right',
      render: (v) => `₹${Number(v).toFixed(4)}`,
    },
    {
      title: 'Gain / Loss (₹)',
      dataIndex: 'gainLossInr',
      key: 'gainLossInr',
      align: 'right',
      render: (v) => (
        <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'} style={{ fontFamily: 'monospace' }}>
          {fmtInr(Number(v))}
        </Tag>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Forex Gain / Loss"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Forex Gain/Loss' }]}
      />

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {summary && (
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Realized Gain"
                  value={`₹${Number(summary.totalRealizedGain).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  valueStyle={{ color: 'green' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Realized Loss"
                  value={`₹${Number(summary.totalRealizedLoss).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  valueStyle={{ color: 'red' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Net Gain / Loss"
                  value={fmtInr(Number(summary.netGainLoss))}
                  valueStyle={{ color: summary.netGainLoss >= 0 ? 'green' : 'red' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Payments" value={summary.paymentCount} />
              </Card>
            </Col>
          </Row>
        )}

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(v) => setDateRange(v as [Dayjs | null, Dayjs | null])}
            />
            <Select
              placeholder="Currency"
              allowClear
              style={{ width: 120 }}
              onChange={(v) => setCurrency(v || '')}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </Space>
          <Table
            dataSource={rows}
            columns={columns}
            rowKey="paymentId"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            summary={(pageData) => {
              const net = pageData.reduce((s, r) => s + Number(r.gainLossInr), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={7}><strong>Page Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Tag color={net > 0 ? 'green' : net < 0 ? 'red' : 'default'} style={{ fontFamily: 'monospace' }}>
                      {fmtInr(net)}
                    </Tag>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
            locale={{
              emptyText: (
                <EmptyState
                  type="no-results"
                  title="No forex data"
                  description="No cleared payments found in the selected period."
                />
              ),
            }}
          />
        </Card>
      </Space>
    </>
  );
}