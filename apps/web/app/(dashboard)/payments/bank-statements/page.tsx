'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Upload, Space, Steps, Modal, Alert, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UploadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface BankStatement {
  id: string;
  bankName: string;
  accountNumber: string;
  statementDate: string;
  currency: string;
  totalCredits: number;
  totalDebits: number;
  entryCount: number;
  unreconciledCount: number;
}

interface StatementEntry {
  id: string;
  entryDate: string;
  description: string;
  reference: string;
  entryType: 'CREDIT' | 'DEBIT';
  amount: number;
  reconciliationStatus: string;
}

export default function BankStatementsPage() {
  const { message } = App.useApp();
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [parsedEntries, setParsedEntries] = useState<StatementEntry[]>([]);
  const [importModal, setImportModal] = useState(false);
  const [viewModal, setViewModal] = useState<{ open: boolean; statementId: string; entries: StatementEntry[] } | null>(null);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments/bank-statements');
      const payload = data.data || data;
      setStatements(Array.isArray(payload) ? payload : payload.data || []);
    } catch {
      message.error('Failed to load bank statements');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchStatements(); }, [fetchStatements]);

  const handleUpload = async (file: File) => {
    setImporting(true);
    setImportStep(1);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/payments/bank-statements/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = data.data || data;
      setParsedEntries(result.entries || []);
      setImportStep(2);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to parse file');
      setImportStep(0);
    } finally {
      setImporting(false);
    }
    return false;
  };

  const confirmImport = async () => {
    try {
      message.success('Bank statement imported successfully');
      setImportModal(false);
      setImportStep(0);
      setParsedEntries([]);
      fetchStatements();
    } catch {
      message.error('Import failed');
    }
  };

  const viewEntries = async (id: string) => {
    try {
      const { data } = await api.get(`/payments/bank-statements/${id}/entries`);
      const payload = data.data || data;
      setViewModal({ open: true, statementId: id, entries: Array.isArray(payload) ? payload : payload.data || [] });
    } catch {
      message.error('Failed to load entries');
    }
  };

  const deleteStatement = async (id: string) => {
    try {
      await api.delete(`/payments/bank-statements/${id}`);
      message.success('Statement deleted');
      fetchStatements();
    } catch {
      message.error('Failed to delete');
    }
  };

  const columns: ColumnsType<BankStatement> = [
    {
      title: 'Bank / Account',
      key: 'bank',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{r.bankName}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{r.accountNumber}</span>
        </Space>
      ),
    },
    { title: 'Statement Date', dataIndex: 'statementDate', key: 'statementDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80 },
    { title: 'Credits', dataIndex: 'totalCredits', key: 'totalCredits', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Debits', dataIndex: 'totalDebits', key: 'totalDebits', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Entries', dataIndex: 'entryCount', key: 'entryCount', align: 'center' },
    {
      title: 'Unreconciled',
      dataIndex: 'unreconciledCount',
      key: 'unreconciledCount',
      align: 'center',
      render: (v) => v > 0 ? <span style={{ color: 'orange', fontWeight: 500 }}>{v}</span> : <span style={{ color: 'green' }}>0</span>,
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" intent="default" icon={<EyeOutlined />} onClick={() => viewEntries(r.id)} aria-label="View entries" />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteStatement(r.id)} aria-label="Delete" />
        </Space>
      ),
    },
  ];

  const entryColumns: ColumnsType<StatementEntry> = [
    { title: 'Date', dataIndex: 'entryDate', key: 'entryDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Reference', dataIndex: 'reference', key: 'reference' },
    {
      title: 'Type',
      dataIndex: 'entryType',
      key: 'entryType',
      render: (v) => <span style={{ color: v === 'CREDIT' ? 'green' : 'red' }}>{v}</span>,
    },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Recon Status', dataIndex: 'reconciliationStatus', key: 'reconciliationStatus' },
  ];

  return (
    <>
      <PageHeader
        title="Bank Statements"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Bank Statements' }]}
        actions={
          <Button intent="finance" icon={<UploadOutlined />} onClick={() => { setImportModal(true); setImportStep(0); setParsedEntries([]); }}>
            Import Statement
          </Button>
        }
      />

      <Card>
        <Table
          dataSource={statements}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{
            emptyText: (
              <EmptyState
                type="no-data"
                title="No bank statements"
                description="Import a bank statement CSV or Excel file to begin reconciliation."
                actionLabel="Import Statement"
                onAction={() => setImportModal(true)}
              />
            ),
          }}
        />
      </Card>

      {/* Import Modal */}
      <Modal
        title="Import Bank Statement"
        open={importModal}
        onCancel={() => { setImportModal(false); setImportStep(0); setParsedEntries([]); }}
        footer={null}
        width={640}
      >
        <Steps
          current={importStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Upload File' },
            { title: 'Parse & Preview' },
            { title: 'Confirm Import' },
          ]}
        />

        {importStep === 0 && (
          <Upload.Dragger
            accept=".csv,.xls,.xlsx"
            showUploadList={false}
            beforeUpload={(file) => { handleUpload(file as File); return false; }}
            disabled={importing}
          >
            <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 32 }} /></p>
            <p>{importing ? 'Parsing file…' : 'Click or drag CSV / Excel file here'}</p>
            <p style={{ color: '#999', fontSize: 12 }}>Supported: .csv, .xls, .xlsx</p>
          </Upload.Dragger>
        )}

        {importStep === 2 && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert type="success" message={`${parsedEntries.length} entries parsed successfully`} showIcon />
            <Divider orientation="left" orientationMargin={0}>Preview (first 10 rows)</Divider>
            <Table
              dataSource={parsedEntries.slice(0, 10)}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Date', dataIndex: 'entryDate', key: 'entryDate', render: (d) => dayjs(d).format('DD MMM') },
                { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
                { title: 'Type', dataIndex: 'entryType', key: 'type', width: 60 },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
              ]}
            />
            <Space style={{ justifyContent: 'flex-end', display: 'flex', marginTop: 16 }}>
              <Button intent="default" onClick={() => { setImportStep(0); setParsedEntries([]); }}>Back</Button>
              <Button intent="finance" onClick={confirmImport}>Confirm Import</Button>
            </Space>
          </Space>
        )}
      </Modal>

      {/* View Entries Modal */}
      <Modal
        title="Statement Entries"
        open={!!viewModal?.open}
        onCancel={() => setViewModal(null)}
        footer={null}
        width={960}
      >
        <Table
          dataSource={viewModal?.entries || []}
          columns={entryColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: <EmptyState type="no-data" title="No entries" /> }}
        />
      </Modal>
    </>
  );
}