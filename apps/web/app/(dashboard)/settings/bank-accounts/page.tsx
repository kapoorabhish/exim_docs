'use client';

import React, { useEffect, useState } from 'react';
import { App, Card, Table, Modal, Form, Input, Select, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

interface BankAccount {
  id: string;
  bankName: string;
  branch?: string;
  accountNumber: string;
  ifscCode?: string;
  swiftCode?: string;
  accountType: string;
  currency: string;
}

export default function BankAccountsPage() {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tenant/bank-accounts');
      setAccounts(data.data || data);
    } catch {
      message.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openModal = (account?: BankAccount) => {
    setEditing(account || null);
    form.resetFields();
    if (account) form.setFieldsValue(account);
    setModalOpen(true);
  };

  const onSave = async (values: Record<string, string>) => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/tenant/bank-accounts/${editing.id}`, values);
        message.success('Bank account updated');
      } else {
        await api.post('/tenant/bank-accounts', values);
        message.success('Bank account added');
      }
      setModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/tenant/bank-accounts/${id}`);
      message.success('Bank account deleted');
      fetchAccounts();
    } catch {
      message.error('Failed to delete');
    }
  };

  const columns = [
    { title: 'Bank Name', dataIndex: 'bankName', key: 'bankName' },
    { title: 'Account Number', dataIndex: 'accountNumber', key: 'accountNumber' },
    { title: 'IFSC', dataIndex: 'ifscCode', key: 'ifscCode' },
    { title: 'SWIFT', dataIndex: 'swiftCode', key: 'swiftCode' },
    { title: 'Type', dataIndex: 'accountType', key: 'accountType' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: BankAccount) => (
        <Space>
          <Button size="small" intent="default" icon={<EditOutlined />} aria-label="Edit bank account" onClick={() => openModal(record)} />
          <Popconfirm title="Delete this account?" onConfirm={() => onDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete bank account" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Bank Accounts"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Bank Accounts' }]}
        actions={
          <Button intent="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            Add Bank Account
          </Button>
        }
      />

      <Card>
        <Table
          dataSource={accounts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Bank Account' : 'Add Bank Account'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="Bank Name" name="bankName" rules={[{ required: true }]}>
            <Input placeholder="e.g. State Bank of India" />
          </Form.Item>
          <Form.Item label="Branch" name="branch">
            <Input placeholder="Branch name" />
          </Form.Item>
          <Form.Item label="Account Number" name="accountNumber" rules={[{ required: true }]}>
            <Input placeholder="Account number" />
          </Form.Item>
          <Form.Item label="IFSC Code" name="ifscCode">
            <Input placeholder="IFSC code" />
          </Form.Item>
          <Form.Item label="SWIFT Code" name="swiftCode">
            <Input placeholder="SWIFT/BIC code" />
          </Form.Item>
          <Form.Item label="Account Type" name="accountType">
            <Select options={[{ value: 'CURRENT', label: 'Current' }, { value: 'SAVINGS', label: 'Savings' }]} />
          </Form.Item>
          <Form.Item label="Currency" name="currency">
            <Input placeholder="e.g. INR, USD" />
          </Form.Item>
          <Form.Item>
            <Button intent="primary" htmlType="submit" loading={saving} block>
              {editing ? 'Update' : 'Add'} Account
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
