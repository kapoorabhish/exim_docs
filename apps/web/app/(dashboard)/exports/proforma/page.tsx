'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../../components/coming-soon';

export default function ProformaPage() {
  return (
    <>
      <PageHeader title="Proforma Invoices" breadcrumbs={[{ label: 'Exports' }, { label: 'Proforma' }]} />
      <ComingSoon title="Proforma Invoices" />
    </>
  );
}
