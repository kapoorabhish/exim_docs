import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Space } from 'antd';
import { CurrencyDisplay } from './CurrencyDisplay';

const meta: Meta<typeof CurrencyDisplay> = {
  title: 'Components/CurrencyDisplay',
  component: CurrencyDisplay,
  argTypes: {
    currencyCode: {
      control: 'select',
      options: ['USD', 'EUR', 'GBP', 'INR', 'AED', 'JPY', 'CNY'],
    },
    size: {
      control: 'select',
      options: ['small', 'default', 'large'],
    },
    showCode: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof CurrencyDisplay>;

export const Default: Story = {
  args: {
    amount: 12500.00,
    currencyCode: 'USD',
    showCode: true,
  },
};

export const WithINREquivalent: Story = {
  args: {
    amount: 25000.00,
    currencyCode: 'USD',
    inrEquivalent: 2075000,
    showCode: true,
  },
};

export const MultipleCurrencies: Story = {
  render: () => (
    <Space direction="vertical" size={16}>
      <CurrencyDisplay amount={50000} currencyCode="USD" inrEquivalent={4150000} />
      <CurrencyDisplay amount={45000} currencyCode="EUR" inrEquivalent={4050000} />
      <CurrencyDisplay amount={35000} currencyCode="GBP" inrEquivalent={3675000} />
      <CurrencyDisplay amount={183750} currencyCode="AED" inrEquivalent={4150000} />
      <CurrencyDisplay amount={7500000} currencyCode="JPY" inrEquivalent={4125000} />
      <CurrencyDisplay amount={2500000} currencyCode="INR" />
    </Space>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Space direction="vertical" size={16}>
      <CurrencyDisplay amount={12500} currencyCode="USD" size="small" />
      <CurrencyDisplay amount={12500} currencyCode="USD" size="default" />
      <CurrencyDisplay amount={12500} currencyCode="USD" size="large" />
    </Space>
  ),
};
