'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { App, Card, Result, Spin, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../lib/auth-store';
import api from '../../../lib/api';

const { Text } = Typography;

function VerifyPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const setAuth = useAuthStore((s) => s.setAuth);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided. Please check your email link.');
      return;
    }

    api
      .post('/auth/verify-email', { token })
      .then(({ data }) => {
        const result = data.data || data;
        setAuth(result.user, result.tenant, result.accessToken, result.refreshToken);
        setStatus('success');
        // Redirect after a short delay
        setTimeout(() => {
          const role = result.user?.role;
          router.push(role === 'SUPER_ADMIN' ? '/admin' : '/settings/profile');
        }, 2000);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Verification failed. The link may have expired.';
        setErrorMsg(msg);
        setStatus('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === 'loading') {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Verifying your email...</Text>
        </div>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#4F46E5' }} />}
          title="Email Verified!"
          subTitle="Your account is now active. Redirecting you..."
        />
      </Card>
    );
  }

  return (
    <Card>
      <Result
        icon={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
        title="Verification Failed"
        subTitle={errorMsg}
        extra={
          <Button intent="primary" onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        }
      />
    </Card>
  );
}

export default function VerifyPageWrapper() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '80px auto' }} />}>
      <VerifyPage />
    </Suspense>
  );
}
