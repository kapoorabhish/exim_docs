'use client';

import React, { useState } from 'react';
import { App, Card, Form, Input, Typography, Divider } from 'antd';
import { MailOutlined, LockOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';

const { Text } = Typography;

export default function SignupPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: Record<string, string>) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/signup', {
        companyName: values.companyName,
        email: values.email,
        password: values.password,
        phone: values.phone,
      });
      message.success('Verification email sent! Check your inbox.');
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Signup failed';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Text strong style={{ fontSize: 20, display: 'block', textAlign: 'center', marginBottom: 4 }}>
        Create your account
      </Text>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        Start managing your export-import documentation
      </Text>

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="companyName" rules={[{ required: true, message: 'Company name is required' }]}>
          <Input prefix={<BankOutlined />} placeholder="Company Name" size="large" />
        </Form.Item>

        <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
          <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
        </Form.Item>

        <Form.Item name="phone">
          <Input prefix={<PhoneOutlined />} placeholder="Phone Number (optional)" size="large" />
        </Form.Item>

        <Form.Item name="password" rules={[{ required: true, min: 8, message: 'Min 8 characters' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Form.Item name="confirmPassword" rules={[{ required: true, message: 'Confirm your password' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button intent="primary" htmlType="submit" block size="large" loading={loading}>
            Create Account
          </Button>
        </Form.Item>
      </Form>

      <Divider plain>
        <Text type="secondary">Already have an account?</Text>
      </Divider>

      <div style={{ textAlign: 'center' }}>
        <Link href="/login">Log in</Link>
      </div>
    </Card>
  );
}
