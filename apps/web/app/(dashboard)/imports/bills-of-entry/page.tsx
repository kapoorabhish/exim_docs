'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../../components/coming-soon';

export default function BillsOfEntryPage() {
  return (
    <>
      <PageHeader title="Bills of Entry" breadcrumbs={[{ label: 'Imports' }, { label: 'Bills of Entry' }]} />
      <ComingSoon title="Bills of Entry" />
    </>
  );
}
