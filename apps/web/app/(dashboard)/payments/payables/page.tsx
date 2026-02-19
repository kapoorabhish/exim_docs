'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../../components/coming-soon';

export default function PayablesPage() {
  return (
    <>
      <PageHeader title="Payables" breadcrumbs={[{ label: 'Payments' }, { label: 'Payables' }]} />
      <ComingSoon title="Payables" />
    </>
  );
}
