'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { PageHeader, StatCard } from '@exim/ui';
import api from '../../../../lib/api';


interface DashboardData {
  kpis: { totalReceivables: number; totalPayables: number; netPosition: number; pendingExportInvoices: number; overduePayablesCount: number };
  collections: { thisMonth: number; lastMonth: number };
  payments: { thisMonth: number; lastMonth: number };
  upcoming: { payables7Days: number; payables30Days: number };
  top5Buyers: { buyer: { id: string; name: string }; totalOutstanding: number }[];
}

export default function PaymentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/dashboard')
      .then(({ data: d }) => setData(d.data || d))
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis;
  const collections = data?.collections;
  const payments = data?.payments;

  const collectionsChange = collections && collections.lastMonth > 0
    ? ((collections.thisMonth - collections.lastMonth) / collections.lastMonth) * 100
    : 0;
  const paymentsChange = payments && payments.lastMonth > 0
    ? ((payments.thisMonth - payments.lastMonth) / payments.lastMonth) * 100
    : 0;

  const fmtInr = (v: number) => `₹ ${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader
        title="Payment Dashboard"
        breadcrumbs={[{ label: 'Payments' }, { label: 'Dashboard' }]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Total Receivables" value={kpis ? fmtInr(kpis.totalReceivables) : '—'} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Overdue Payables" value={kpis ? fmtInr(kpis.totalPayables) : '—'} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Net Position" value={kpis ? fmtInr(kpis.netPosition) : '—'} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Overdue Payables Count" value={kpis ? String(kpis.overduePayablesCount) : '—'} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Collections" loading={loading}>
            <Row>
              <Col span={12}>
                <Statistic title="This Month" value={collections?.thisMonth ?? 0} prefix="₹" precision={2} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="vs Last Month"
                  value={Math.abs(collectionsChange)}
                  precision={1}
                  suffix="%"
                  prefix={collectionsChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  valueStyle={{ color: collectionsChange >= 0 ? '#16a34a' : '#dc2626' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Payments Made" loading={loading}>
            <Row>
              <Col span={12}>
                <Statistic title="This Month" value={payments?.thisMonth ?? 0} prefix="₹" precision={2} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="vs Last Month"
                  value={Math.abs(paymentsChange)}
                  precision={1}
                  suffix="%"
                  prefix={paymentsChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  valueStyle={{ color: paymentsChange <= 0 ? '#16a34a' : '#dc2626' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Upcoming Payables" loading={loading}>
            <Statistic title="Due in 7 days" value={data?.upcoming?.payables7Days ?? 0} suffix="invoices" />
            <Statistic title="Due in 30 days" value={data?.upcoming?.payables30Days ?? 0} suffix="invoices" style={{ marginTop: 16 }} />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="Top Buyers by Outstanding" loading={loading}>
            <Table
              dataSource={data?.top5Buyers ?? []}
              rowKey={(r) => r.buyer.id}
              pagination={false}
              size="small"
              columns={[
                { title: 'Buyer', dataIndex: ['buyer', 'name'], key: 'buyer' },
                {
                  title: 'Outstanding (₹)', dataIndex: 'totalOutstanding', key: 'amount', align: 'right',
                  render: (v) => fmtInr(Number(v)),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}