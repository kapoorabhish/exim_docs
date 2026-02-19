import React from 'react';
import { Breadcrumb, Typography, Space } from 'antd';
import { colors } from '../tokens/colors';

const { Title } = Typography;

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={breadcrumbs.map((item) => ({
            title: item.href ? <a href={item.href}>{item.label}</a> : item.label,
          }))}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <span style={{ color: colors.neutral[500], fontSize: 14 }}>{subtitle}</span>
          )}
        </Space>
        {actions && <Space>{actions}</Space>}
      </div>
    </div>
  );
}
