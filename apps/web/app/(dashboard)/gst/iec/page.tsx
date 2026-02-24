'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { App, Card, Descriptions, Form, Input, Space, Popconfirm, Tag, Divider, Drawer } from 'antd';
import { CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, Button, StatusBadge } from '@exim/ui';
import api from '../../../../lib/api';

interface IecStatus {
  iecNumber: string;
  iecStatus: 'ACTIVE' | 'UPDATE_DUE' | 'DEACTIVATED';
  iecLastConfirmedAt: string | null;
  adCode: string | null;
  adBankName: string | null;
  adCodePorts: string | null;
  gstin: string | null;
}

function toLower(s: string) {
  return s.toLowerCase().replace(/_/g, '_') as any;
}

export default function IecPage() {
  const { message } = App.useApp();
  const [iec, setIec] = useState<IecStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [adDrawerOpen, setAdDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adForm] = Form.useForm();

  const fetchIec = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/gst/iec');
      setIec(data.data || data);
    } catch {
      message.error('Failed to load IEC status');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => { fetchIec(); }, [fetchIec]);

  const confirmUpdate = async () => {
    setConfirming(true);
    try {
      await api.post('/gst/iec/confirm');
      message.success('Annual IEC update confirmed');
      fetchIec();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to confirm update');
    } finally {
      setConfirming(false);
    }
  };

  const saveAdCode = async (values: any) => {
    setSaving(true);
    try {
      await api.put('/gst/iec/ad-code', values);
      message.success('AD Code details updated');
      setAdDrawerOpen(false);
      fetchIec();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update AD Code');
    } finally {
      setSaving(false);
    }
  };

  const openAdDrawer = () => {
    adForm.setFieldsValue({
      adCode: iec?.adCode ?? '',
      adBankName: iec?.adBankName ?? '',
      adCodePorts: iec?.adCodePorts ?? '',
    });
    setAdDrawerOpen(true);
  };

  if (!loading && !iec) {
    return (
      <>
        <PageHeader title="IEC Tracking" breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'IEC Tracking' }]} />
        <Card><p style={{ color: '#888', textAlign: 'center', padding: 32 }}>Business profile not found. Complete the profile setup first.</p></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="IEC Tracking"
        breadcrumbs={[{ label: 'GST & Compliance' }, { label: 'IEC Tracking' }]}
        actions={
          <Space>
            <Button intent="default" icon={<EditOutlined />} onClick={openAdDrawer}>
              Update AD Code
            </Button>
            <Popconfirm
              title="Confirm annual IEC update with DGFT?"
              description="This marks the IEC as confirmed for the current year. Proceed?"
              onConfirm={confirmUpdate}
            >
              <Button intent="finance" icon={<CheckCircleOutlined />} loading={confirming}>
                Confirm Annual Update
              </Button>
            </Popconfirm>
          </Space>
        }
      />

      <Card loading={loading}>
        {iec && (
          <>
            <Divider orientation="left" orientationMargin={0}>IEC Details</Divider>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="IEC Number">
                <span style={{ fontWeight: 600, fontSize: 16 }}>{iec.iecNumber || '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={toLower(iec.iecStatus)} />
              </Descriptions.Item>
              <Descriptions.Item label="GSTIN">{iec.gstin || '—'}</Descriptions.Item>
              <Descriptions.Item label="Last Confirmed">
                {iec.iecLastConfirmedAt ? dayjs(iec.iecLastConfirmedAt).format('DD MMM YYYY') : (
                  <Tag color="orange">Never confirmed</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" orientationMargin={0} style={{ marginTop: 24 }}>AD Code Details</Divider>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="AD Code">{iec.adCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="AD Bank">{iec.adBankName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ports (AD Code registered at)" span={2}>
                {iec.adCodePorts || '—'}
              </Descriptions.Item>
            </Descriptions>

            {iec.iecStatus === 'UPDATE_DUE' && (
              <div style={{ marginTop: 16 }}>
                <Tag color="orange" icon={<CheckCircleOutlined />}>
                  Annual IEC update is due — click &quot;Confirm Annual Update&quot; after filing on DGFT portal
                </Tag>
              </div>
            )}
          </>
        )}
      </Card>

      <Drawer
        title="Update AD Code Details"
        open={adDrawerOpen}
        onClose={() => setAdDrawerOpen(false)}
        width={640}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button intent="default" onClick={() => setAdDrawerOpen(false)}>Cancel</Button>
            <Button intent="finance" loading={saving} onClick={() => adForm.submit()}>Save</Button>
          </Space>
        }
      >
        <Form form={adForm} layout="vertical" onFinish={saveAdCode}>
          <Form.Item label="AD Code" name="adCode">
            <Input placeholder="e.g. 0240422" />
          </Form.Item>
          <Form.Item label="AD Bank Name" name="adBankName">
            <Input placeholder="e.g. HDFC Bank" />
          </Form.Item>
          <Form.Item label="Ports (comma-separated port codes)" name="adCodePorts">
            <Input.TextArea rows={2} placeholder="e.g. INMAA, INNSA" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}