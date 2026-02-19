'use client';

import React, { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from '../../components/sidebar';
import AppHeader from '../../components/app-header';
import AuthGuard from '../../components/auth-guard';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
          <AppHeader />
          <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </AuthGuard>
  );
}
