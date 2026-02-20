'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { App, Card, Table, Input, Tabs, Tag } from 'antd';
import { PageHeader } from '@exim/ui';
import api from '../../../../lib/api';

/* ─── Types ─────────────────────────────────────────────────── */
interface Port { code: string; name: string; country: string; portType: string }
interface Country { code: string; alpha3: string; name: string; currencyCode?: string; hasFta?: boolean }
interface HsCode { code: string; chapter: string; description: string; bcdRate?: number; igstRate?: number }
interface Uom { code: string; name: string }
interface Incoterm { code: string; name: string; riskTransferPoint?: string; mode?: string }

/* ─── Generic search table ───────────────────────────────────── */
function SearchTable<T extends object>({
  endpoint,
  columns,
  rowKey,
  searchPlaceholder,
}: {
  endpoint: string;
  columns: any[];
  rowKey: keyof T | string;
  searchPlaceholder: string;
}) {
  const { message } = App.useApp();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (q) params.q = q;
      const { data: res } = await api.get(endpoint, { params });
      const payload = res.data || res;
      setData(Array.isArray(payload) ? payload : payload.data || []);
    } catch {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [endpoint, message]);

  useEffect(() => { fetch(''); }, [fetch]);

  const onSearch = (value: string) => {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetch(value), 350);
  };

  return (
    <>
      <Input.Search
        placeholder={searchPlaceholder}
        allowClear
        style={{ width: 360, marginBottom: 16 }}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onSearch={onSearch}
      />
      <Table
        dataSource={data}
        columns={columns}
        rowKey={rowKey as string}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
    </>
  );
}

/* ─── Column definitions ─────────────────────────────────────── */
const portColumns = [
  { title: 'Code', dataIndex: 'code', key: 'code', width: 90 },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Country', dataIndex: 'country', key: 'country', width: 80 },
  {
    title: 'Type', dataIndex: 'portType', key: 'portType', width: 80,
    render: (t: string) => <Tag color={t === 'SEA' ? 'blue' : t === 'AIR' ? 'cyan' : 'default'}>{t}</Tag>,
  },
];

const countryColumns = [
  { title: 'ISO-2', dataIndex: 'code', key: 'code', width: 70 },
  { title: 'ISO-3', dataIndex: 'alpha3', key: 'alpha3', width: 70 },
  { title: 'Country Name', dataIndex: 'name', key: 'name' },
  { title: 'Currency', dataIndex: 'currencyCode', key: 'currencyCode', width: 90 },
  {
    title: 'FTA', dataIndex: 'hasFta', key: 'hasFta', width: 60,
    render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
  },
];

const hsColumns = [
  { title: 'HS Code', dataIndex: 'code', key: 'code', width: 100 },
  { title: 'Chapter', dataIndex: 'chapter', key: 'chapter', width: 80 },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'BCD %', dataIndex: 'bcdRate', key: 'bcdRate', width: 75, align: 'right' as const, render: (v: number) => v != null ? `${v}%` : '—' },
  { title: 'IGST %', dataIndex: 'igstRate', key: 'igstRate', width: 75, align: 'right' as const, render: (v: number) => v != null ? `${v}%` : '—' },
];

const uomColumns = [
  { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
  { title: 'Name', dataIndex: 'name', key: 'name' },
];

const incotermColumns = [
  { title: 'Code', dataIndex: 'code', key: 'code', width: 80 },
  { title: 'Full Name', dataIndex: 'name', key: 'name' },
  { title: 'Risk Transfers At', dataIndex: 'riskTransferPoint', key: 'riskTransferPoint' },
  { title: 'Mode', dataIndex: 'mode', key: 'mode', width: 90 },
];

/* ─── Page ───────────────────────────────────────────────────── */
export default function ReferenceDataPage() {
  return (
    <>
      <PageHeader
        title="Reference Data"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Reference Data' }]}
      />
      <Card>
        <Tabs
          defaultActiveKey="ports"
          items={[
            {
              key: 'ports',
              label: 'Ports',
              children: (
                <SearchTable<Port>
                  endpoint="/reference/ports"
                  columns={portColumns}
                  rowKey="code"
                  searchPlaceholder="Search by code, name, or country..."
                />
              ),
            },
            {
              key: 'countries',
              label: 'Countries',
              children: (
                <SearchTable<Country>
                  endpoint="/reference/countries"
                  columns={countryColumns}
                  rowKey="code"
                  searchPlaceholder="Search by code or country name..."
                />
              ),
            },
            {
              key: 'hs-codes',
              label: 'HS Codes',
              children: (
                <SearchTable<HsCode>
                  endpoint="/reference/hs-codes"
                  columns={hsColumns}
                  rowKey="code"
                  searchPlaceholder="Search by HS code or description..."
                />
              ),
            },
            {
              key: 'uoms',
              label: 'Units of Measure',
              children: (
                <SearchTable<Uom>
                  endpoint="/reference/uoms"
                  columns={uomColumns}
                  rowKey="code"
                  searchPlaceholder="Search UOMs..."
                />
              ),
            },
            {
              key: 'incoterms',
              label: 'Incoterms',
              children: (
                <SearchTable<Incoterm>
                  endpoint="/reference/incoterms"
                  columns={incotermColumns}
                  rowKey="code"
                  searchPlaceholder="Search Incoterms..."
                />
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}