'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../../components/coming-soon';

export default function ReceivablesPage() {
  return (
    <>
      <PageHeader title="Receivables" breadcrumbs={[{ label: 'Payments' }, { label: 'Receivables' }]} />
      <ComingSoon title="Receivables" />
    </>
  );
}
