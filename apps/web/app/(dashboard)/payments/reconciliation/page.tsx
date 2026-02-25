'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Space, Tag, Select, Popconfirm, Alert, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SyncOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface BankEntry {
  id: string;
  entryDate: string;
  description: string;
  reference: string;
  entryType: 'CREDIT' | 'DEBIT';
  amount: number;
  reconciliationStatus: string;
}

interface UnmatchedPayment {
  id: string;
  paymentDate: string;
  referenceNumber?: string;
  foreignAmount: number;
  currency: string;
  type: 'EXPORT' | 'IMPORT' | 'ADVANCE';
  buyer?: { name: string };
}

interface Statement {
  id: string;
  bankName: string;
  accountNumber: string;
  statementDate: string;
}

function toLower(s: string) { return s.toLowerCase().replace(/_/g, '_') as any; }

export default function ReconciliationPage() {
  const { message } = App.useApp();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string>('');
  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [payments, setPayments] = useState<{ exportPayments: UnmatchedPayment[]; importPayments: UnmatchedPayment[]; advances: UnmatchedPayment[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BankEntry | null>(null);
  const [matchCount, setMatchCount] = useState<{ matched: number; total: number } | null>(null);

  const fetchStatements = useCallback(async () => {
    try {
      const { data } = await api.get('/payments/bank-statements');
      const payload = data.data || data;
      const stmts = Array.isArray(payload) ? payload : payload.data || [];
      setStatements(stmts);
      if (stmts.length && !selectedStatement) setSelectedStatement(stmts[0].id);
    } catch {
      message.error('Failed to load bank statements');
    }
  }, [selectedStatement, message]);

  const fetchEntries = useCallback(async () => {
    if (!selectedStatement) return;
    setLoading(true);
    try {
      const { data } = await api.get('/payments/reconciliation/unreconciled', { params: { statementId: selectedStatement } });
      const payload = data.data || data;
      setEntries(Array.isArray(payload) ? payload : payload.data || []);
    } catch {
      message.error('Failed to load unreconciled entries');
    } finally {
      setLoading(false);
    }
  }, [selectedStatement, message]);

  const fetchPayments = useCallback(async () => {
    try {
      const { data } = await api.get('/payments/reconciliation/unmatched');
      setPayments(data.data || data);
    } catch {
      message.error('Failed to load unmatched payments');
    }
  }, [message]);

  useEffect(() => { fetchStatements(); fetchPayments(); }, [fetchStatements, fetchPayments]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const autoMatch = async () => {
    if (!selectedStatement) return;
    setAutoMatching(true);
    try {
      const { data } = await api.post('/payments/reconciliation/auto-match', { statementId: selectedStatement });
      const result = data.data || data;
      setMatchCount(result);
      message.success(`Auto-match complete: ${result.matched} of ${result.total} entries matched`);
      fetchEntries();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Auto-match failed');
    } finally {
      setAutoMatching(false);
    }
  };

  const manualMatch = async (payment: UnmatchedPayment) => {
    if (!selectedEntry) return;
    try {
      await api.post('/payments/reconciliation/manual-match', {
        entryId: selectedEntry.id,
        paymentType: payment.type,
        paymentId: payment.id,
      });
      message.success('Manually matched');
      setSelectedEntry(null);
      fetchEntries();
      fetchPayments();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Match failed');
    }
  };

  const entryColumns: ColumnsType<BankEntry> = [
    { title: 'Date', dataIndex: 'entryDate', key: 'entryDate', width: 100, render: (d) => dayjs(d).format('DD MMM') },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 120 },
    { title: 'Type', dataIndex: 'entryType', key: 'type', width: 60, render: (v) => <span style={{ color: v === 'CREDIT' ? 'green' : 'red' }}>{v}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', width: 110, render: (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Status', dataIndex: 'reconciliationStatus', key: 'status', width: 120, render: (s) => <StatusBadge status={toLower(s)} size="small" /> },
  ];

  const allPayments = [
    ...(payments?.exportPayments || []),
    ...(payments?.importPayments || []),
    ...(payments?.advances || []),
  ];

  const paymentColumns: ColumnsType<UnmatchedPayment> = [
    { title: 'Reference', dataIndex: 'referenceNumber', key: 'ref', render: (v) => v || '—' },
    { title: 'Date', dataIndex: 'paymentDate', key: 'date', width: 100, render: (d) => dayjs(d).format('DD MMM') },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 70, render: (v) => <Tag color={v === 'EXPORT' ? 'blue' : v === 'IMPORT' ? 'orange' : 'purple'}>{v}</Tag> },
    { title: 'Amount', dataIndex: 'foreignAmount', key: 'amount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    {
      title: '',
      key: 'link',
      render: (_, r) =>
        selectedEntry ? (
          <Popconfirm title={`Link this payment to entry "${selectedEntry.reference}"?`} onConfirm={() => manualMatch(r)}>
            <Button size="small" intent="finance" icon={<LinkOutlined />}>Link</Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Reconciliation Workspace"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Reconciliation' }]}
        actions={
          <Popconfirm title="Run auto-match on unreconciled credit entries?" onConfirm={autoMatch}>
            <Button intent="finance" icon={<SyncOutlined />} loading={autoMatching}>
              Auto-Match
            </Button>
          </Popconfirm>
        }
      />

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small">
          <Space>
            <span>Bank Statement:</span>
            <Select
              value={selectedStatement}
              onChange={(v) => setSelectedStatement(v)}
              style={{ width: 300 }}
              options={statements.map((s) => ({
                value: s.id,
                label: `${s.bankName} — ${s.accountNumber} (${dayjs(s.statementDate).format('MMM YYYY')})`,
              }))}
              placeholder="Select a bank statement"
            />
          </Space>
        </Card>

        {matchCount && (
          <Alert type="success" showIcon message={`Auto-match: ${matchCount.matched} matched out of ${matchCount.total} entries`} closable onClose={() => setMatchCount(null)} />
        )}

        {selectedEntry && (
          <Alert
            type="info"
            showIcon
            message={`Selected entry: ${selectedEntry.reference} · ${Number(selectedEntry.amount).toLocaleString('en-IN')} · Click "Link" on a payment below to match.`}
            closable
            onClose={() => setSelectedEntry(null)}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title={`Unreconciled Bank Entries (${entries.length})`} size="small">
            <Table
              dataSource={entries}
              columns={entryColumns}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              onRow={(r) => ({
                onClick: () => setSelectedEntry(r),
                style: { cursor: 'pointer', background: selectedEntry?.id === r.id ? '#e6f4ff' : undefined },
              })}
              locale={{
                emptyText: (
                  <EmptyState
                    type={selectedStatement ? 'no-data' : 'no-data'}
                    title="No unreconciled entries"
                    description="All entries have been matched or no statement is selected."
                  />
                ),
              }}
            />
          </Card>

          <Card title={`Unmatched Payments (${allPayments.length})`} size="small">
            <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12 }}>
              {selectedEntry ? 'Click "Link" to manually match selected entry' : 'Select an entry on the left to enable manual matching'}
            </Divider>
            <Table
              dataSource={allPayments}
              columns={paymentColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{
                emptyText: (
                  <EmptyState
                    type="no-data"
                    title="No unmatched payments"
                    description="All payments have been reconciled."
                  />
                ),
              }}
            />
          </Card>
        </div>
      </Space>
    </>
  );
}