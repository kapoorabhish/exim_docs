'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, DatePicker, Space, Alert, Statistic, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { PageHeader, Button, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface TallyPaymentRow {
  paymentId: string;
  paymentDate: string;
  paymentNumber: string;
  invoiceNumber: string;
  buyerName: string;
  currency: string;
  foreignAmount: number;
  inrAmount: number;
  exchangeRate: number;
}

interface TallyPreview {
  payments: TallyPaymentRow[];
  totalInr: number;
  paymentCount: number;
}

export default function TallyExportPage() {
  const { message } = App.useApp();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [preview, setPreview] = useState<TallyPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchPreview = useCallback(async () => {
    if (!dateRange[0] || !dateRange[1]) return;
    setLoading(true);
    try {
      const { data } = await api.get('/payments/tally-export/preview', {
        params: {
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
        },
      });
      setPreview(data.data || data);
    } catch {
      message.error('Failed to load preview');
    } finally {
      setLoading(false);
    }
  }, [dateRange, message]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const downloadXml = async () => {
    if (!dateRange[0] || !dateRange[1]) return;
    setDownloading(true);
    try {
      const { data: blob } = await api.get('/payments/tally-export/download', {
        params: {
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
        },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TallyExport_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Tally XML downloaded');
    } catch {
      message.error('Failed to download XML');
    } finally {
      setDownloading(false);
    }
  };

  const columns: ColumnsType<TallyPaymentRow> = [
    { title: 'Payment Date', dataIndex: 'paymentDate', key: 'paymentDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Payment No.', dataIndex: 'paymentNumber', key: 'paymentNumber', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Invoice No.', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
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
      title: 'Exchange Rate',
      dataIndex: 'exchangeRate',
      key: 'exchangeRate',
      align: 'right',
      render: (v) => `₹${Number(v).toFixed(4)}`,
    },
    {
      title: 'INR Amount',
      dataIndex: 'inrAmount',
      key: 'inrAmount',
      align: 'right',
      render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tally Export"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Tally Export' }]}
        actions={
          <Button
            intent="finance"
            icon={<DownloadOutlined />}
            loading={downloading}
            disabled={!preview?.payments.length}
            onClick={downloadXml}
          >
            Export XML
          </Button>
        }
      />

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card size="small">
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(v) => setDateRange(v as [Dayjs | null, Dayjs | null])}
          />
        </Card>

        {preview && (
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small">
                <Statistic title="Payments to Export" value={preview.paymentCount} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Total INR Value"
                  value={`₹${Number(preview.totalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Alert
          type="info"
          showIcon
          message="Tally XML export format"
          description="The exported XML file follows the Tally TDL import format for foreign currency receipts. Import it via Gateway of Tally → Import Data → Vouchers."
        />

        <Card title="Payment Preview">
          <Table
            dataSource={preview?.payments || []}
            columns={columns}
            rowKey="paymentId"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            summary={(pageData) => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>₹{pageData.reduce((s, r) => s + Number(r.inrAmount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            locale={{
              emptyText: (
                <EmptyState
                  type="no-results"
                  title="No payments in range"
                  description="No export payments found for the selected date range."
                />
              ),
            }}
          />
        </Card>
      </Space>
    </>
  );
}