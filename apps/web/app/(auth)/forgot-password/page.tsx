'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Typography, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import Link from 'next/link';
import api from '../../../lib/api';

const { Text } = Typography;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card>
        <Result
          status="success"
          title="Check your email"
          subTitle="If an account exists with that email, we've sent a password reset link."
          extra={<Link href="/login">Back to login</Link>}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text strong style={{ fontSize: 20, display: 'block', textAlign: 'center', marginBottom: 4 }}>
        Forgot your password?
      </Text>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        Enter your email and we&apos;ll send you a reset link
      </Text>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
          <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
        </Form.Item>

        <Form.Item>
          <Button intent="primary" htmlType="submit" block size="large" loading={loading}>
            Send Reset Link
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Link href="/login">Back to login</Link>
      </div>
    </Card>
  );
}
