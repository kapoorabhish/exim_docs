'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, Modal, Form, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, StatCard, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface BoeRow {
  id: string;
  boeNumber: string | null;
  invoice: { id: string; invoiceNumber: string; invoiceDate: string } | null;
  filingDate: string | null;
  igst: number;
  igstCreditStatus: 'UNCLAIMED' | 'CLAIMED';
  gstr3bMonth: string | null;
}

interface Summary {
  unclaimed: { count: number; totalIgst: number };
  claimed: { count: number; totalIgst: number };
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = dayjs().subtract(i, 'month');
  return { value: d.format('YYYY-MM'), label: d.format('MMM YYYY') };
});

export default function IgstCreditPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<BoeRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [claimModal, setClaimModal] = useState<{ open: boolean; boeId: string; boeNumber: string } | null>(null);
  const [claimMonth, setClaimMonth] = useState(dayjs().subtract(1, 'month').format('YYYY-MM'));
  const [claiming, setClaiming] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const [rowsRes, summaryRes] = await Promise.all([
        api.get('/gst/igst-credit', { params }),
        api.get('/gst/igst-credit/summary'),
      ]);
      const payload = rowsRes.data.data || rowsRes.data;
      setRows(Array.isArray(payload) ? payload : payload.data || []);
      setSummary(summaryRes.data.data || summaryRes.data);
    } catch {
      message.error('Failed to load IGST credit data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const claimCredit = async () => {
    if (!claimModal) return;
    setClaiming(true);
    try {
      await api.put(`/gst/igst-credit/${claimModal.boeId}/claim`, { gstr3bMonth: claimMonth });
      message.success(`IGST credit claimed for ${claimMonth}`);
      setClaimModal(null);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to claim credit');
    } finally {
      setClaiming(false);
    }
  };

  const columns: ColumnsType<BoeRow> = [
    { title: 'BoE Number', dataIndex: 'boeNumber', key: 'boeNumber', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Invoice No.', key: 'invoiceNumber', render: (_, r) => r.invoice?.invoiceNumber ?? '—' },
    { title: 'Filing Date', dataIndex: 'filingDate', key: 'filingDate', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    {
      title: 'IGST Amount (₹)',
      dataIndex: 'igst',
      key: 'igst',
      align: 'right',
      render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Credit Status',
      dataIndex: 'igstCreditStatus',
      key: 'igstCreditStatus',
      render: (s) => <StatusBadge status={s === 'UNCLAIMED' ? 'unclaimed' : 'claimed'} />,
    },
    { title: 'GSTR-3B Month', dataIndex: 'gstr3bMonth', key: 'gstr3bMonth', render: (v) => v || '—' },
    {
      title: '',
      key: 'actions',
      render: (_, r) =>
        r.igstCreditStatus === 'UNCLAIMED' ? (
          <Button
            size="small"
            intent="finance"
            icon={<CheckOutlined />}
            onClick={() => setClaimModal({ open: true, boeId: r.id, boeNumber: r.boeNumber ?? '' })}
          >
            Mark Claimed
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="IGST Credit Register"
        breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'IGST Credit Register' }]}
      />

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard label="Total IGST" value={`₹${(summary.unclaimed.totalIgst + summary.claimed.totalIgst).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} loading={loading} />
            <StatCard label="Claimed" value={`₹${summary.claimed.totalIgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} loading={loading} />
            <StatCard label="Unclaimed" value={`₹${summary.unclaimed.totalIgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} loading={loading} />
            <StatCard label="BoE Count" value={String(summary.unclaimed.count + summary.claimed.count)} loading={loading} />
          </div>
        )}

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 180 }}
              onChange={(v) => setStatusFilter(v || '')}
              options={[
                { value: 'UNCLAIMED', label: 'Unclaimed' },
                { value: 'CLAIMED', label: 'Claimed' },
              ]}
            />
          </Space>
          <Table
            dataSource={rows}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            locale={{
              emptyText: (
                <EmptyState
                  type={statusFilter ? 'no-results' : 'no-data'}
                  title={statusFilter ? 'No matching records' : 'No BoE records'}
                  description={statusFilter ? 'Try clearing the filter.' : 'Bills of Entry with IGST will appear here once filed.'}
                />
              ),
            }}
          />
        </Card>
      </Space>

      <Modal
        title={`Claim IGST Credit — BoE ${claimModal?.boeNumber}`}
        open={!!claimModal?.open}
        onCancel={() => setClaimModal(null)}
        footer={
          <Space>
            <Button intent="default" onClick={() => setClaimModal(null)}>Cancel</Button>
            <Popconfirm
              title={`Claim IGST credit in GSTR-3B for ${claimMonth}?`}
              onConfirm={claimCredit}
            >
              <Button intent="finance" loading={claiming} icon={<CheckOutlined />}>
                Confirm Claim
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="GSTR-3B Month">
            <Select
              value={claimMonth}
              onChange={(v) => setClaimMonth(v)}
              options={MONTHS}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}