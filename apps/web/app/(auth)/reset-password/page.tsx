'use client';

import React, { Suspense, useState } from 'react';
import { App, Card, Form, Input, Typography, Result, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';

const { Text } = Typography;

function ResetPasswordForm() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const onFinish = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Reset failed';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <Result
          status="success"
          title="Password reset successful"
          subTitle="You can now log in with your new password."
          extra={<Link href="/login">Go to login</Link>}
        />
      </Card>
    );
  }

  if (!token) {
    return (
      <Card>
        <Result
          status="error"
          title="Invalid reset link"
          subTitle="The reset link is missing or invalid."
          extra={<Link href="/forgot-password">Request a new link</Link>}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text strong style={{ fontSize: 20, display: 'block', textAlign: 'center', marginBottom: 4 }}>
        Set new password
      </Text>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        Enter your new password below
      </Text>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="newPassword" rules={[{ required: true, min: 8, message: 'Min 8 characters' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="New Password" size="large" />
        </Form.Item>

        <Form.Item name="confirmPassword" rules={[{ required: true, message: 'Confirm your password' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button intent="primary" htmlType="submit" block size="large" loading={loading}>
            Reset Password
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
