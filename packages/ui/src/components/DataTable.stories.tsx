import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from 'antd';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import type { DocumentStatusType } from '@exim/shared';

interface InvoiceRow {
  key: string;
  invoiceNo: string;
  date: string;
  buyer: string;
  amount: string;
  currency: string;
  status: DocumentStatusType;
}

const columns = [
  { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo', sorter: true },
  { title: 'Date', dataIndex: 'date', key: 'date', sorter: true },
  { title: 'Buyer', dataIndex: 'buyer', key: 'buyer', sorter: true },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const },
  { title: 'Currency', dataIndex: 'currency', key: 'currency', render: (v: string) => <Tag>{v}</Tag> },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: DocumentStatusType) => <StatusBadge status={status} size="small" />,
  },
];

const data: InvoiceRow[] = [
  { key: '1', invoiceNo: 'EXP/INV/2026/0042', date: '17 Feb 2026', buyer: 'Global Traders LLC', amount: '25,000.00', currency: 'USD', status: 'approved' },
  { key: '2', invoiceNo: 'EXP/INV/2026/0041', date: '15 Feb 2026', buyer: 'Dubai Imports FZE', amount: '18,500.00', currency: 'AED', status: 'shipped' },
  { key: '3', invoiceNo: 'EXP/INV/2026/0040', date: '12 Feb 2026', buyer: 'London Trade Co.', amount: '32,100.00', currency: 'GBP', status: 'filed' },
  { key: '4', invoiceNo: 'EXP/INV/2026/0039', date: '10 Feb 2026', buyer: 'Berlin GmbH', amount: '15,750.00', currency: 'EUR', status: 'pending' },
  { key: '5', invoiceNo: 'EXP/INV/2026/0038', date: '08 Feb 2026', buyer: 'Tokyo Corp', amount: '2,800,000', currency: 'JPY', status: 'cleared' },
  { key: '6', invoiceNo: 'EXP/INV/2026/0037', date: '05 Feb 2026', buyer: 'Singapore Pte Ltd', amount: '42,000.00', currency: 'SGD', status: 'draft' },
];

const meta: Meta<typeof DataTable<InvoiceRow>> = {
  title: 'Components/DataTable',
  component: DataTable,
};

export default meta;
type Story = StoryObj<typeof DataTable<InvoiceRow>>;

export const Default: Story = {
  render: () => <DataTable<InvoiceRow> columns={columns} dataSource={data} pageSize={5} />,
};

export const NoPagination: Story = {
  render: () => <DataTable<InvoiceRow> columns={columns} dataSource={data.slice(0, 3)} pagination={false} />,
};
