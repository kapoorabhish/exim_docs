'use client';

import React from 'react';
import { Layout, Dropdown, Avatar, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/auth-store';

const { Header } = Layout;
const { Text } = Typography;

export default function AppHeader() {
  const router = useRouter();
  const { user, tenant, logout } = useAuthStore();

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => router.push('/settings/profile'),
    },
    ...(user?.role === 'ADMIN'
      ? [{
          key: 'settings',
          icon: <SettingOutlined />,
          label: 'Settings',
          onClick: () => router.push('/settings/profile'),
        }]
      : []),
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: async () => {
        await logout();
        router.push('/login');
      },
    },
  ];

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        height: 64,
      }}
    >
      <div>
        <Text strong style={{ fontSize: 14, color: '#64748b' }}>
          {tenant?.name || 'EXIM'}
        </Text>
      </div>

      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            src={user?.avatarUrl}
            style={{ backgroundColor: '#4338CA' }}
          />
          <Text style={{ fontSize: 14 }}>{user?.displayName || 'User'}</Text>
        </Space>
      </Dropdown>
    </Header>
  );
}
