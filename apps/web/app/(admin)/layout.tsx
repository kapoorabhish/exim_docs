'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { Spin, Typography, Space } from 'antd';
import { useAuthStore } from '../../lib/auth-store';
import AppHeader from '../../components/app-header';

const { Sider, Content } = Layout;
const { Text } = Typography;

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role !== 'SUPER_ADMIN') {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return <>{children}</>;
}

const MENU_ITEMS = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Overview' },
  { key: '/admin/tenants', icon: <TeamOutlined />, label: 'Tenants' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const selectedKey = MENU_ITEMS.find((item) => pathname === item.key)?.key ?? '/admin';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <SuperAdminGuard>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          width={220}
          style={{
            background: '#1e1b4b',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            overflow: 'auto',
          }}
        >
          {/* Logo */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Text strong style={{ color: '#fff', fontSize: 16 }}>EXIM Platform</Text>
            <br />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Super Admin</Text>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ background: '#1e1b4b', border: 'none', marginTop: 8 }}
            items={MENU_ITEMS.map((item) => ({
              ...item,
              onClick: () => router.push(item.key),
            }))}
          />

          {/* Logout at bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Space
              style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.65)' }}
              onClick={handleLogout}
            >
              <LogoutOutlined />
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Logout</Text>
            </Space>
          </div>
        </Sider>

        <Layout style={{ marginLeft: 220 }}>
          <AppHeader />
          <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </SuperAdminGuard>
  );
}