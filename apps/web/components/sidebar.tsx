'use client';

import React from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  ExportOutlined,
  ImportOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  ShoppingCartOutlined,
  AuditOutlined,
  BankOutlined,
  TeamOutlined,
  ProfileOutlined,
  BlockOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  SwapOutlined,
  ContainerOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/auth-store';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getMenuItems(role: string): MenuItem[] {
  const items: MenuItem[] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/exports',
      icon: <ExportOutlined />,
      label: 'Exports',
      children: [
        { key: '/exports/proforma-invoices', icon: <FileDoneOutlined />, label: 'Proforma Invoices' },
        { key: '/exports/invoices', icon: <FileTextOutlined />, label: 'Invoices' },
        { key: '/exports/packing-lists', icon: <ContainerOutlined />, label: 'Packing Lists' },
        { key: '/exports/shipping-bills', icon: <AuditOutlined />, label: 'Shipping Bills' },
        { key: '/exports/register', icon: <UnorderedListOutlined />, label: 'Export Register' },
      ],
    },
    {
      key: '/imports',
      icon: <ImportOutlined />,
      label: 'Imports',
      children: [
        { key: '/imports/purchase-orders', icon: <ShoppingCartOutlined />, label: 'Purchase Orders' },
        { key: '/imports/supplier-invoices', icon: <FileTextOutlined />, label: 'Supplier Invoices' },
        { key: '/imports/bills-of-entry', icon: <BlockOutlined />, label: 'Bills of Entry' },
        { key: '/imports/import-bl', icon: <ContainerOutlined />, label: 'Import B/L' },
        { key: '/imports/register', icon: <UnorderedListOutlined />, label: 'Import Register' },
      ],
    },
    {
      key: '/payments',
      icon: <DollarOutlined />,
      label: 'Payments',
      children: [
        { key: '/payments/receivables', icon: <BankOutlined />, label: 'Receivables' },
        { key: '/payments/payables', icon: <BankOutlined />, label: 'Payables' },
      ],
    },
    {
      key: '/master-data',
      icon: <DatabaseOutlined />,
      label: 'Master Data',
      children: [
        { key: '/master-data/parties', icon: <TeamOutlined />, label: 'Parties' },
        { key: '/master-data/products', icon: <AppstoreOutlined />, label: 'Products' },
      ],
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Reports',
    },
  ];

  if (role === 'ADMIN') {
    items.push({
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        { key: '/settings/profile', icon: <ProfileOutlined />, label: 'Business Profile' },
        { key: '/settings/users', icon: <TeamOutlined />, label: 'Users' },
        { key: '/settings/bank-accounts', icon: <BankOutlined />, label: 'Bank Accounts' },
        { key: '/settings/exchange-rates', icon: <SwapOutlined />, label: 'Exchange Rates' },
        { key: '/settings/templates', icon: <FileTextOutlined />, label: 'Templates' },
        { key: '/settings/reference-data', icon: <GlobalOutlined />, label: 'Reference Data' },
      ],
    });
  }

  return items;
}

/** Collect all leaf keys from the menu tree */
function collectLeafKeys(items: MenuItem[]): string[] {
  const keys: string[] = [];
  for (const item of items) {
    if (item && 'children' in item && item.children) {
      keys.push(...collectLeafKeys(item.children as MenuItem[]));
    } else if (item && 'key' in item && typeof item.key === 'string') {
      keys.push(item.key);
    }
  }
  return keys;
}

/** Find the most specific menu key whose path is a prefix of the current pathname */
function findSelectedKey(pathname: string, items: MenuItem[]): string {
  const leafKeys = collectLeafKeys(items);
  // Sort longest-first so the most specific match wins
  const sorted = leafKeys.sort((a, b) => b.length - a.length);
  return sorted.find((k) => pathname === k || pathname.startsWith(k + '/')) || pathname;
}

function findOpenKeys(pathname: string, items: MenuItem[]): string[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 1) {
    // Open the top-level parent group
    return ['/' + segments[0]];
  }
  return [];
}

export default function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: (c: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'VIEWER';

  const items = getMenuItems(role);
  const selectedKey = findSelectedKey(pathname, items);
  const openKeys = findOpenKeys(pathname, items);

  const onClick: MenuProps['onClick'] = (e) => {
    router.push(e.key);
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        borderRight: '1px solid #f0f0f0',
      }}
      theme="light"
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 24px',
          fontWeight: 700,
          fontSize: collapsed ? 20 : 18,
          color: '#4338CA',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {collapsed ? 'E' : 'EXIM'}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={openKeys}
        items={items}
        onClick={onClick}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
}
