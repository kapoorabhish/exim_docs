import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Space } from 'antd';
import { DocumentCard } from './DocumentCard';

const meta: Meta<typeof DocumentCard> = {
  title: 'Components/DocumentCard',
  component: DocumentCard,
  argTypes: {
    documentType: {
      control: 'select',
      options: [
        'commercial_invoice', 'proforma_invoice', 'packing_list',
        'shipping_bill', 'bill_of_entry', 'bill_of_lading', 'purchase_order',
      ],
    },
    status: {
      control: 'select',
      options: ['draft', 'pending', 'filed', 'assessed', 'approved', 'shipped', 'cleared'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DocumentCard>;

export const Default: Story = {
  args: {
    documentType: 'commercial_invoice',
    documentNumber: 'EXP/INV/2026/0042',
    date: '17 Feb 2026',
    status: 'filed',
    partyName: 'Global Traders LLC',
    amount: '$ 25,000.00',
  },
};

export const DocumentTypes: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 300px)', gap: 16 }}>
      <DocumentCard
        documentType="commercial_invoice"
        documentNumber="EXP/INV/2026/0042"
        date="17 Feb 2026"
        status="approved"
        partyName="Global Traders LLC"
        amount="$ 25,000.00"
      />
      <DocumentCard
        documentType="shipping_bill"
        documentNumber="SB/2026/00891"
        date="16 Feb 2026"
        status="filed"
        partyName="Global Traders LLC"
      />
      <DocumentCard
        documentType="bill_of_entry"
        documentNumber="BOE/2026/00234"
        date="15 Feb 2026"
        status="assessed"
        partyName="Shanghai Exports Co."
        amount="CIF ¥ 180,000"
      />
      <DocumentCard
        documentType="packing_list"
        documentNumber="PL/2026/0042"
        date="17 Feb 2026"
        status="draft"
        partyName="Global Traders LLC"
      />
      <DocumentCard
        documentType="bill_of_lading"
        documentNumber="MAEU123456789"
        date="18 Feb 2026"
        status="shipped"
        partyName="Maersk Line"
      />
      <DocumentCard
        documentType="purchase_order"
        documentNumber="PO/2026/00156"
        date="10 Feb 2026"
        status="pending"
        partyName="Vietnam Textiles Ltd"
        amount="$ 18,500.00"
      />
    </div>
  ),
};

export const Clickable: Story = {
  args: {
    documentType: 'proforma_invoice',
    documentNumber: 'PI/2026/0089',
    date: '14 Feb 2026',
    status: 'approved',
    partyName: 'Dubai Imports FZE',
    amount: 'AED 91,250.00',
    onClick: () => alert('Card clicked!'),
  },
};
