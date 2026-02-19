'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../../components/coming-soon';

export default function ShippingBillsPage() {
  return (
    <>
      <PageHeader title="Shipping Bills" breadcrumbs={[{ label: 'Exports' }, { label: 'Shipping Bills' }]} />
      <ComingSoon title="Shipping Bills" />
    </>
  );
}
