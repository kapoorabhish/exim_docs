'use client';

import React, { useEffect, useState } from 'react';
import { App, Card, Table, Modal, Form, Input, Select, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { PageHeader, Button } from '@exim/ui';
import Link from 'next/link';
import api from '../../../../lib/api';

// Pending role change — awaiting confirmation before the API call is made
interface PendingRoleChange {
  userId: string;
  userName: string;
  fromRole: string;
  toRole: string;
}

const ROLES = [
  'ADMIN', 'ACCOUNTANT', 'EXPORT_MANAGER', 'IMPORT_MANAGER',
  'SALES_MANAGER', 'PURCHASE_MANAGER', 'INVENTORY_MANAGER', 'DATA_ENTRY', 'VIEWER',
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'red',
  ACCOUNTANT: 'purple',
  EXPORT_MANAGER: 'green',
  IMPORT_MANAGER: 'orange',
  SALES_MANAGER: 'blue',
  PURCHASE_MANAGER: 'cyan',
  INVENTORY_MANAGER: 'geekblue',
  DATA_ENTRY: 'default',
  VIEWER: 'default',
};

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  lastLoginAt?: string;
}

export default function UsersPage() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data || data);
    } catch {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const onInvite = async (values: { email: string; role: string }) => {
    setInviting(true);
    try {
      await api.post('/users/invite', values);
      message.success(`Invitation sent to ${values.email}`);
      setInviteOpen(false);
      form.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const onRequestRoleChange = (record: UserRecord, newRole: string) => {
    if (newRole === record.role) return;
    setPendingRoleChange({
      userId: record.id,
      userName: record.displayName,
      fromRole: record.role,
      toRole: newRole,
    });
  };

  const onConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    try {
      await api.put(`/users/${pendingRoleChange.userId}/role`, { role: pendingRoleChange.toRole });
      message.success(`${pendingRoleChange.userName}'s role updated to ${pendingRoleChange.toRole.replace(/_/g, ' ')}`);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to change role');
    } finally {
      setPendingRoleChange(null);
    }
  };

  const onToggleStatus = async (user: UserRecord) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/users/${user.id}/status`, { status: newStatus });
      message.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const onRemove = async (userId: string) => {
    try {
      await api.delete(`/users/${userId}`);
      message.success('User removed');
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to remove user');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'displayName', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: UserRecord) => (
        <Select
          value={role}
          size="small"
          style={{ width: 160 }}
          onChange={(val) => onRequestRoleChange(record, val)}
          options={ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: UserRecord) => (
        <Space>
          <Button
            size="small"
            intent="default"
            onClick={() => onToggleStatus(record)}
          >
            {record.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
          <Popconfirm title="Remove this user?" onConfirm={() => onRemove(record.id)}>
            <Button size="small" danger icon={<UserDeleteOutlined />} aria-label="Remove user" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users' }]}
        actions={
          <Space>
            <Link href="/settings/users/permissions">
              <Button intent="default">View Permissions</Button>
            </Link>
            <Button intent="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>
              Invite User
            </Button>
          </Space>
        }
      />

      <Card>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="Change User Role"
        open={!!pendingRoleChange}
        onOk={onConfirmRoleChange}
        onCancel={() => setPendingRoleChange(null)}
        okText="Change Role"
        okButtonProps={{ danger: true }}
      >
        {pendingRoleChange && (
          <p>
            Change <strong>{pendingRoleChange.userName}</strong>'s role from{' '}
            <Tag color={ROLE_COLORS[pendingRoleChange.fromRole]}>{pendingRoleChange.fromRole.replace(/_/g, ' ')}</Tag>
            to{' '}
            <Tag color={ROLE_COLORS[pendingRoleChange.toRole]}>{pendingRoleChange.toRole.replace(/_/g, ' ')}</Tag>?
            <br />
            <span style={{ color: '#8c8c8c', fontSize: 13 }}>
              This will immediately change what the user can access.
            </span>
          </p>
        )}
      </Modal>

      <Modal
        title="Invite User"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onInvite}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="user@company.com" />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select
              placeholder="Select role"
              options={ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
            />
          </Form.Item>
          <Form.Item>
            <Button intent="primary" htmlType="submit" loading={inviting} block>
              Send Invitation
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
