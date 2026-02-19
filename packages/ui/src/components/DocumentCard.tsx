import React from 'react';
import { Card, Typography, Space } from 'antd';
import {
  FileTextOutlined,
  FileDoneOutlined,
  ContainerOutlined,
  AuditOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { DocumentTypeConfig, type DocumentTypeValue, type DocumentStatusType } from '@exim/shared';
import { StatusBadge } from './StatusBadge';
import { colors } from '../tokens/colors';

const { Text } = Typography;

export interface DocumentCardProps {
  documentType: DocumentTypeValue;
  documentNumber: string;
  date: string;
  status: DocumentStatusType;
  partyName: string;
  amount?: string;
  onClick?: () => void;
}

const iconMap: Partial<Record<DocumentTypeValue, React.ReactNode>> = {
  commercial_invoice: <FileTextOutlined />,
  proforma_invoice: <FileTextOutlined />,
  shipping_bill: <AuditOutlined />,
  bill_of_entry: <AuditOutlined />,
  bill_of_lading: <ContainerOutlined />,
  packing_list: <SolutionOutlined />,
  purchase_order: <FileDoneOutlined />,
};

export function DocumentCard({
  documentType,
  documentNumber,
  date,
  status,
  partyName,
  amount,
  onClick,
}: DocumentCardProps) {
  const typeConfig = DocumentTypeConfig[documentType];
  const icon = iconMap[documentType] ?? <FileTextOutlined />;

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      size="small"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size={8}>
            <span style={{ color: colors.primary[600], fontSize: 16 }}>{icon}</span>
            <Text strong style={{ fontSize: 13 }}>
              {typeConfig?.shortLabel ?? documentType}
            </Text>
          </Space>
          <StatusBadge status={status} size="small" />
        </Space>

        <Text style={{ fontSize: 14, fontWeight: 600 }}>{documentNumber}</Text>

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{partyName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{date}</Text>
        </Space>

        {amount && (
          <Text style={{ fontSize: 13, fontWeight: 500 }}>{amount}</Text>
        )}
      </Space>
    </Card>
  );
}
