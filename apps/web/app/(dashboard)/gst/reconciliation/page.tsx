'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface SbMismatch {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  gstr1Filed: boolean;
  shippingBillCount: number;
  issue: 'NO_SHIPPING_BILL' | 'NOT_FILED_IN_GSTR1' | 'OK';
}

interface BoeMismatch {
  boeId: string;
  boeNumber: string;
  invoiceNumber: string;
  igst: number;
  igstCreditStatus: string;
  gstr3bMonth?: string;
  issue: 'UNCLAIMED_IGST' | 'CLAIMED_DIFFERENT_MONTH';
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = dayjs().subtract(i, 'month');
  return { value: d.format('YYYY-MM'), label: d.format('MMM YYYY') };
});

const ISSUE_COLOR: Record<string, string> = {
  NO_SHIPPING_BILL: 'red',
  NOT_FILED_IN_GSTR1: 'orange',
  UNCLAIMED_IGST: 'red',
  CLAIMED_DIFFERENT_MONTH: 'orange',
};

const ISSUE_LABEL: Record<string, string> = {
  NO_SHIPPING_BILL: 'No Shipping Bill',
  NOT_FILED_IN_GSTR1: 'Not Filed in GSTR-1',
  UNCLAIMED_IGST: 'Unclaimed IGST',
  CLAIMED_DIFFERENT_MONTH: 'Different Month',
};

export default function GstReconciliationPage() {
  const { message } = App.useApp();
  const [month, setMonth] = useState(dayjs().subtract(1, 'month').format('YYYY-MM'));
  const [sbMismatches, setSbMismatches] = useState<SbMismatch[]>([]);
  const [boeMismatches, setBoeMismatches] = useState<BoeMismatch[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sbRes, boeRes] = await Promise.all([
        api.get('/gst/reconciliation/sb-vs-gstr1', { params: { month } }),
        api.get('/gst/reconciliation/boe-vs-gstr3b', { params: { month } }),
      ]);
      const sbPayload = sbRes.data.data || sbRes.data;
      const boePayload = boeRes.data.data || boeRes.data;
      setSbMismatches(Array.isArray(sbPayload) ? sbPayload : sbPayload.data || []);
      setBoeMismatches(Array.isArray(boePayload) ? boePayload : boePayload.data || []);
    } catch {
      message.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  }, [month, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sbColumns: ColumnsType<SbMismatch> = [
    { title: 'Invoice No.', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Total Amt', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'SBs Linked', dataIndex: 'shippingBillCount', key: 'shippingBillCount', align: 'center' },
    { title: 'GSTR-1 Filed', dataIndex: 'gstr1Filed', key: 'gstr1Filed', render: (v) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Issue', dataIndex: 'issue', key: 'issue', render: (v) => <Tag color={ISSUE_COLOR[v]}>{ISSUE_LABEL[v]}</Tag> },
  ];

  const boeColumns: ColumnsType<BoeMismatch> = [
    { title: 'BoE Number', dataIndex: 'boeNumber', key: 'boeNumber', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Invoice No.', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'IGST (₹)', dataIndex: 'igst', key: 'igst', align: 'right', render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Credit Status', dataIndex: 'igstCreditStatus', key: 'igstCreditStatus', render: (v) => <Tag color={v === 'UNCLAIMED' ? 'orange' : 'blue'}>{v}</Tag> },
    { title: 'GSTR-3B Month', dataIndex: 'gstr3bMonth', key: 'gstr3bMonth', render: (v) => v || '—' },
    { title: 'Issue', dataIndex: 'issue', key: 'issue', render: (v) => <Tag color={ISSUE_COLOR[v]}>{ISSUE_LABEL[v]}</Tag> },
  ];

  const tabItems = [
    {
      key: 'sb',
      label: `SB vs GSTR-1 (${sbMismatches.length})`,
      children: (
        <Table
          dataSource={sbMismatches}
          columns={sbColumns}
          rowKey="invoiceId"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState
                type="no-results"
                title="No mismatches"
                description="All export invoices are reconciled with shipping bills and GSTR-1."
              />
            ),
          }}
        />
      ),
    },
    {
      key: 'boe',
      label: `BoE vs GSTR-3B (${boeMismatches.length})`,
      children: (
        <Table
          dataSource={boeMismatches}
          columns={boeColumns}
          rowKey="boeId"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState
                type="no-results"
                title="No unclaimed credits"
                description="All IGST credits have been claimed in GSTR-3B."
              />
            ),
          }}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="GST Reconciliation"
        breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'GST Reconciliation' }]}
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={month}
            onChange={(v) => setMonth(v)}
            options={MONTHS}
            style={{ width: 160 }}
          />
        </Space>
        <Tabs items={tabItems} />
      </Card>
    </>
  );
}