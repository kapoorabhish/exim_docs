'use client';

import React from 'react';
import { Typography, Space, Row, Col, Divider } from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  PageHeader,
  Button,
  StatCard,
  DocumentCard,
  EmptyState,
  colors,
} from '@exim/ui';

const { Text } = Typography;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Export-Import Documentation Management System"
        actions={
          <Space>
            <Button intent="export" icon={<ExportOutlined />}>New Export</Button>
            <Button intent="import" icon={<ImportOutlined />}>New Import</Button>
          </Space>
        }
      />

      {/* KPI Cards — TODO Sprint 2: replace with real /api/dashboard/stats data */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Total Exports (YTD)"
            value="$2.4M"
            trend={{ direction: 'up', percentage: 12.5, label: 'vs last year' }}
            icon={<ExportOutlined />}
            accentColor={colors.module.export[600]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Total Imports (YTD)"
            value="$1.8M"
            trend={{ direction: 'down', percentage: 3.2, label: 'vs last year' }}
            icon={<ImportOutlined />}
            accentColor={colors.module.import[600]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Outstanding"
            value="₹45.2L"
            trend={{ direction: 'up', percentage: 8.1, label: 'vs last month' }}
            icon={<DollarOutlined />}
            accentColor={colors.module.finance[600]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Pending Documents"
            value="23"
            icon={<FileTextOutlined />}
            accentColor={colors.warning[500]}
          />
        </Col>
      </Row>

      <Divider />

      {/* Recent Documents — TODO Sprint 2: replace with real /api/documents/recent data */}
      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
        Recent Documents
      </Text>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <DocumentCard
            documentType="commercial_invoice"
            documentNumber="EXP/INV/2026/0042"
            date="17 Feb 2026"
            status="approved"
            partyName="Global Traders LLC"
            amount="$ 25,000.00"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <DocumentCard
            documentType="shipping_bill"
            documentNumber="SB/2026/00891"
            date="16 Feb 2026"
            status="filed"
            partyName="Global Traders LLC"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <DocumentCard
            documentType="bill_of_entry"
            documentNumber="BOE/2026/00234"
            date="15 Feb 2026"
            status="assessed"
            partyName="Shanghai Exports Co."
            amount="CIF ¥ 180,000"
          />
        </Col>
      </Row>
    </>
  );
}
