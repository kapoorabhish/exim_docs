'use client';

import React, { useEffect, useState } from 'react';
import { App, Card, Form, Input, Select, Row, Col, Divider, Typography } from 'antd';
import { PageHeader, Button } from '@exim/ui';
import api from '../../../../lib/api';

const { Text } = Typography;

// Validation patterns
const IEC_REGEX = /^\d{10}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// GSTIN: 2-digit state code + 10-char PAN + entity no + Z + checksum
const GSTIN_REGEX = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
// AD Code: 14 digits
const AD_CODE_REGEX = /^\d{14}$/;
// TAN: 4 letters + 5 digits + 1 letter (e.g. MUMA12345A)
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
// CIN: 21 chars (e.g. L12345MH2000PLC123456)
const CIN_REGEX = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

const validateIEC = (_: unknown, value: string) => {
  if (!value) return Promise.resolve();
  if (!IEC_REGEX.test(value)) return Promise.reject('IEC must be exactly 10 digits');
  return Promise.resolve();
};

const validateGSTIN = (_: unknown, value: string) => {
  if (!value) return Promise.resolve();
  const upper = value.toUpperCase();
  if (upper.length !== 15) return Promise.reject('GSTIN must be exactly 15 characters');
  const stateCode = parseInt(upper.slice(0, 2), 10);
  if (stateCode < 1 || stateCode > 38) return Promise.reject('First 2 digits must be a valid Indian state code (01–38)');
  if (!GSTIN_REGEX.test(upper)) return Promise.reject('Invalid GSTIN format — expected: 29ABCDE1234F1Z5');
  return Promise.resolve();
};

const validatePAN = (_: unknown, value: string) => {
  if (!value) return Promise.resolve();
  if (!PAN_REGEX.test(value.toUpperCase())) return Promise.reject('PAN format: ABCDE1234F (5 letters, 4 digits, 1 letter)');
  return Promise.resolve();
};

const validateADCode = (_: unknown, value: string) => {
  if (!value) return Promise.resolve();
  if (!AD_CODE_REGEX.test(value)) return Promise.reject('AD Code must be exactly 14 digits');
  return Promise.resolve();
};

const validateTAN = (_: unknown, value: string) => {
  if (!value) return Promise.resolve();
  if (!TAN_REGEX.test(value.toUpperCase())) return Promise.reject('TAN format: MUMA12345A (4 letters, 5 digits, 1 letter)');
  return Promise.resolve();
};

const validateCIN = (_: unknown, value: string) => {
  if (!value) return Promise.resolve();
  if (!CIN_REGEX.test(value.toUpperCase())) return Promise.reject('CIN format: L12345MH2000PLC123456 (21 characters)');
  return Promise.resolve();
};

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function BusinessProfilePage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/tenant/profile')
      .then(({ data }) => {
        const profile = data.data || data;
        form.setFieldsValue(profile);
      })
      .catch(() => { /* profile may not exist yet */ })
      .finally(() => setLoading(false));
  }, [form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.put('/tenant/profile', values);
      message.success('Business profile updated');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Business Profile"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Business Profile' }]}
      />

      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Text strong style={{ fontSize: 16 }}>Company Information</Text>
          <Divider style={{ marginTop: 8 }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Company Name" name="companyName" rules={[{ required: true }]}>
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Registered Address" name="registeredAddress">
                <Input.TextArea rows={3} placeholder="Registered office address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Communication Address" name="communicationAddress">
                <Input.TextArea rows={3} placeholder="Communication address" />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ fontSize: 16 }}>Trade Registrations</Text>
          <Divider style={{ marginTop: 8 }} />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="IEC Number"
                name="iecNumber"
                rules={[{ validator: validateIEC }]}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Format: 10 digits — e.g. 0315012345</Text>}
              >
                <Input placeholder="0315012345" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="GSTIN"
                name="gstin"
                rules={[{ validator: validateGSTIN }]}
                normalize={(v: string) => v?.toUpperCase()}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Format: 29ABCDE1234F1Z5 (state code + PAN + entity + Z + checksum)</Text>}
              >
                <Input placeholder="29ABCDE1234F1Z5" maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="PAN"
                name="pan"
                rules={[{ validator: validatePAN }]}
                normalize={(v: string) => v?.toUpperCase()}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Format: ABCDE1234F (5 letters, 4 digits, 1 letter)</Text>}
              >
                <Input placeholder="ABCDE1234F" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="AD Code"
                name="adCode"
                rules={[{ validator: validateADCode }]}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>14-digit Authorized Dealer Code — issued by your bank, required for Shipping Bill filing on ICEGATE</Text>}
              >
                <Input placeholder="14-digit AD Code" maxLength={14} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="AD Bank"
                name="adBankName"
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Bank that issued your AD Code</Text>}
              >
                <Input placeholder="e.g. State Bank of India" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="TAN"
                name="tan"
                rules={[{ validator: validateTAN }]}
                normalize={(v: string) => v?.toUpperCase()}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Tax Deduction Account Number — 10 chars, e.g. MUMA12345A</Text>}
              >
                <Input placeholder="MUMA12345A" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="CIN"
                name="cin"
                rules={[{ validator: validateCIN }]}
                normalize={(v: string) => v?.toUpperCase()}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Corporate Identity Number — 21 chars, e.g. L12345MH2000PLC123456</Text>}
              >
                <Input placeholder="L12345MH2000PLC123456" maxLength={21} />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ fontSize: 16 }}>Signatory Details</Text>
          <Divider style={{ marginTop: 8 }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Signatory Name" name="signatoryName">
                <Input placeholder="Authorized signatory" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Signatory Designation" name="signatoryDesignation">
                <Input placeholder="e.g. Director, Partner" />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ fontSize: 16 }}>Financial Year</Text>
          <Divider style={{ marginTop: 8 }} />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Financial Year Starts" name="financialYearStartMonth">
                <Select options={months} placeholder="Select month" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button intent="primary" htmlType="submit" loading={saving}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
