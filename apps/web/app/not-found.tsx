'use client';

import React from 'react';
import { Result } from 'antd';
import { Button } from '@exim/ui';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Result
        status="404"
        title="Page Not Found"
        subTitle="The page you are looking for does not exist."
        extra={<Button intent="primary" onClick={() => router.push('/')}>Back to Dashboard</Button>}
      />
    </div>
  );
}
