'use client';
import { PageHeader } from '@exim/ui';
import ComingSoon from '../../../components/coming-soon';

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" breadcrumbs={[{ label: 'Reports' }]} />
      <ComingSoon title="Reports" />
    </>
  );
}
