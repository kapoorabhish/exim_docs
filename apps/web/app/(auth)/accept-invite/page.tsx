'use client';

import React, { Suspense, useState } from 'react';
import { App, Card, Form, Input, Typography, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../lib/auth-store';
import api from '../../../lib/api';

const { Text } = Typography;

function AcceptInviteForm() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: { displayName: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/accept-invite', {
        token,
        displayName: values.displayName,
        password: values.password,
      });
      const result = data.data || data;
      setAuth(result.user, result.tenant, result.accessToken, result.refreshToken);
      message.success('Welcome! Your account has been created.');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to accept invitation';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <Text strong style={{ display: 'block', textAlign: 'center' }}>
          Invalid invitation link
        </Text>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
          Please check your email for the correct invitation link.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text strong style={{ fontSize: 20, display: 'block', textAlign: 'center', marginBottom: 4 }}>
        Accept Invitation
      </Text>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        Set up your account to join the organization
      </Text>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="displayName" rules={[{ required: true, message: 'Name is required' }]}>
          <Input prefix={<UserOutlined />} placeholder="Your Name" size="large" />
        </Form.Item>

        <Form.Item name="password" rules={[{ required: true, min: 8, message: 'Min 8 characters' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Form.Item name="confirmPassword" rules={[{ required: true, message: 'Confirm your password' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button intent="primary" htmlType="submit" block size="large" loading={loading}>
            Create Account & Join
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
