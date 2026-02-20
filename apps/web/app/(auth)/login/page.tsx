'use client';

import React, { useState } from 'react';
import { App, Card, Form, Input, Checkbox, Typography, Divider } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../lib/auth-store';
import api from '../../../lib/api';

const { Text } = Typography;

export default function LoginPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      });
      const result = data.data || data;
      setAuth(result.user, result.tenant, result.accessToken, result.refreshToken);
      message.success('Welcome back!');
      router.push(result.user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Text strong style={{ fontSize: 20, display: 'block', textAlign: 'center', marginBottom: 4 }}>
        Welcome back
      </Text>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        Log in to your EXIM account
      </Text>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
          <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
        </Form.Item>

        <Form.Item name="password" rules={[{ required: true, message: 'Password is required' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox>Remember me</Checkbox>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        </Form.Item>

        <Form.Item>
          <Button intent="primary" htmlType="submit" block size="large" loading={loading}>
            Log In
          </Button>
        </Form.Item>
      </Form>

      <Divider plain>
        <Text type="secondary">New to EXIM?</Text>
      </Divider>

      <div style={{ textAlign: 'center' }}>
        <Link href="/signup">Create an account</Link>
      </div>
    </Card>
  );
}
