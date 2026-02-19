'use client';

import React, { Suspense, useState } from 'react';
import { App, Card, Form, Input, Typography, Spin } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../lib/auth-store';
import api from '../../../lib/api';

const { Text } = Typography;

function VerifyEmailForm() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: { token: string }) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { token: values.token });
      const result = data.data || data;
      setAuth(result.user, result.tenant, result.accessToken, result.refreshToken);
      message.success('Email verified successfully!');
      router.push('/settings/profile');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Verification failed';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Text strong style={{ fontSize: 20, display: 'block', textAlign: 'center', marginBottom: 4 }}>
        Verify your email
      </Text>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        {email ? `We sent a verification code to ${email}` : 'Enter the verification code from your email'}
      </Text>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="token" rules={[{ required: true, message: 'Enter the verification code' }]}>
          <Input prefix={<SafetyOutlined />} placeholder="Verification Code" size="large" />
        </Form.Item>

        <Form.Item>
          <Button intent="primary" htmlType="submit" block size="large" loading={loading}>
            Verify Email
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
