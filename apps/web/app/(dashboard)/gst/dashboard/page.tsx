'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Descriptions, Space, Alert, Tag } from 'antd';
import {
  SafetyCertificateOutlined,
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, StatCard, EmptyState } from '@exim/ui';
import api from '../../../../lib/api';

interface DashboardData {
  lut: {
    hasActive: boolean;
    daysRemaining: number | null;
    expiryDate: string | null;
    arnNumber: string | null;
  };
  gstr1: { pendingInvoices: number };
  igstCredit: { unclaimedCount: number; unclaimedTotal: number };
  iec: { status: string; lastConfirmedAt: string | null };
}

export default function GstDashboardPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/gst/dashboard');
      setData(res.data || res);
    } catch {
      message.error('Failed to load GST dashboard');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const lut = data?.lut;
  const lutDays = lut?.daysRemaining ?? 0;

  const iecStatusColor =
    data?.iec.status === 'ACTIVE' ? 'green'
    : data?.iec.status === 'UPDATE_DUE' ? 'orange'
    : 'red';

  return (
    <>
      <PageHeader
        title="GST & Compliance Dashboard"
        breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'Dashboard' }]}
      />

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard
            label="LUT Expiry"
            value={lut?.hasActive ? `${lutDays}d` : '—'}
            icon={<SafetyCertificateOutlined />}
            loading={loading}
          />
          <StatCard
            label="GSTR-1 Pending"
            value={String(data?.gstr1.pendingInvoices ?? 0)}
            icon={<FileTextOutlined />}
            loading={loading}
          />
          <StatCard
            label="Unclaimed IGST (₹)"
            value={
              data
                ? `₹${Number(data.igstCredit.unclaimedTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : '—'
            }
            icon={<DollarOutlined />}
            loading={loading}
          />
          <StatCard
            label="Unclaimed BoEs"
            value={String(data?.igstCredit.unclaimedCount ?? 0)}
            icon={<CheckCircleOutlined />}
            loading={loading}
          />
        </div>

        {lut?.hasActive && lutDays <= 30 && (
          <Alert
            type={lutDays <= 7 ? 'error' : 'warning'}
            showIcon
            message={`LUT (ARN: ${lut.arnNumber}) expires in ${lutDays} days`}
            description="File a new LUT with GSTN before expiry to continue zero-rated exports."
          />
        )}

        {!lut?.hasActive && !loading && (
          <Alert
            type="error"
            showIcon
            message="No active LUT on file"
            description="Exports cannot be done under zero-rated (LUT) treatment. Please activate a LUT record."
            action={<a href="/gst/lut">Manage LUTs →</a>}
          />
        )}

        <Card title="IEC & Compliance Status">
          {data ? (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="IEC Status">
                <Tag color={iecStatusColor}>{data.iec.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Last Confirmed">
                {data.iec.lastConfirmedAt
                  ? dayjs(data.iec.lastConfirmedAt).format('DD MMM YYYY')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="LUT ARN">
                {lut?.arnNumber ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="LUT Expiry">
                {lut?.expiryDate ? dayjs(lut.expiryDate).format('DD MMM YYYY') : '—'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <EmptyState
              type="no-data"
              title="No compliance data"
              description="Dashboard data will appear here once the API responds."
            />
          )}
        </Card>
      </Space>
    </>
  );
}