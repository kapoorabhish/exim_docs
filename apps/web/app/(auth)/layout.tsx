'use client';

import React from 'react';
import { Layout } from 'antd';

const { Content } = Layout;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: 32,
              fontWeight: 700,
              fontSize: 28,
              color: '#4338CA',
            }}
          >
            EXIM
          </div>
          {children}
        </div>
      </Content>
    </Layout>
  );
}
