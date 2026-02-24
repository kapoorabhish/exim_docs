'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Table, Select, Space, Popconfirm, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface InvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  buyerName: string;
  currency: string;
  totalAmount: number;
  exchangeRate: number;
  fobInr: number;
  sbNumbers: string[];
  gstr1Filed: boolean;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = dayjs().subtract(i, 'month');
  return { value: d.format('YYYY-MM'), label: d.format('MMM YYYY') };
});

export default function Gstr1Page() {
  const { message } = App.useApp();
  const [month, setMonth] = useState(dayjs().subtract(1, 'month').format('YYYY-MM'));
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filing, setFiling] = useState(false);

  const fetch6a = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const { data } = await api.get('/gst/gstr1/table6a', { params: { month } });
      const payload = data.data || data;
      setRows(Array.isArray(payload) ? payload : payload.data || []);
    } catch {
      message.error('Failed to load GSTR-1 Table 6A data');
    } finally {
      setLoading(false);
    }
  }, [month, message]);

  useEffect(() => { fetch6a(); }, [fetch6a]);

  const markFiled = async () => {
    if (!selectedIds.length) return;
    setFiling(true);
    try {
      await api.post('/gst/gstr1/mark-filed', { invoiceIds: selectedIds, month });
      message.success(`${selectedIds.length} invoice(s) marked as filed in GSTR-1`);
      fetch6a();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to mark as filed');
    } finally {
      setFiling(false);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `GSTR1_Table6A_${month}.json`;
    a.click();
  };

  const unfiled = rows.filter((r) => !r.gstr1Filed);

  const columns: ColumnsType<InvoiceRow> = [
    { title: 'Invoice No.', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80 },
    { title: 'Invoice Amt', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (v, r) => `${r.currency} ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'FOB (₹)', dataIndex: 'fobInr', key: 'fobInr', align: 'right', render: (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { title: 'Shipping Bills', dataIndex: 'sbNumbers', key: 'sbNumbers', render: (sbs: string[]) => sbs?.length ? sbs.join(', ') : <Tag color="red">None</Tag> },
    {
      title: 'GSTR-1 Status',
      dataIndex: 'gstr1Filed',
      key: 'gstr1Filed',
      render: (filed) => <Tag color={filed ? 'green' : 'orange'}>{filed ? 'Filed' : 'Pending'}</Tag>,
    },
  ];

  return (
    <>
      <PageHeader
        title="GSTR-1 Table 6A — Export Invoices"
        breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'GSTR-1 Table 6A' }]}
        actions={
          <Space>
            <Button intent="default" icon={<DownloadOutlined />} onClick={downloadJson} disabled={!rows.length}>
              Export JSON
            </Button>
            <Popconfirm
              title={`Mark ${selectedIds.length} selected invoice(s) as filed in GSTR-1?`}
              onConfirm={markFiled}
              disabled={!selectedIds.length}
            >
              <Button intent="finance" icon={<CheckOutlined />} loading={filing} disabled={!selectedIds.length}>
                Mark as Filed ({selectedIds.length})
              </Button>
            </Popconfirm>
          </Space>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={month}
            onChange={(v) => setMonth(v)}
            options={MONTHS}
            style={{ width: 160 }}
          />
          {unfiled.length > 0 && (
            <Tag color="orange">{unfiled.length} invoice(s) not yet filed</Tag>
          )}
        </Space>

        <Table
          dataSource={rows}
          columns={columns}
          rowKey="invoiceId"
          loading={loading}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as string[]),
            getCheckboxProps: (r) => ({ disabled: r.gstr1Filed }),
          }}
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState
                type="no-results"
                title="No export invoices"
                description={`No finalized invoices found for ${dayjs(month).format('MMM YYYY')}.`}
              />
            ),
          }}
        />
      </Card>
    </>
  );
}