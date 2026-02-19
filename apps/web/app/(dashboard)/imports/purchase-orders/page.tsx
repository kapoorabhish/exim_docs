'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../../components/coming-soon';

export default function PurchaseOrdersPage() {
  return (
    <>
      <PageHeader title="Purchase Orders" breadcrumbs={[{ label: 'Imports' }, { label: 'Purchase Orders' }]} />
      <ComingSoon title="Purchase Orders" />
    </>
  );
}
