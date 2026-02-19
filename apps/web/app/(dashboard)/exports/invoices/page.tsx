'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../../components/coming-soon';

export default function InvoicesPage() {
  return (
    <>
      <PageHeader title="Export Invoices" breadcrumbs={[{ label: 'Exports' }, { label: 'Invoices' }]} />
      <ComingSoon title="Export Invoices" />
    </>
  );
}
