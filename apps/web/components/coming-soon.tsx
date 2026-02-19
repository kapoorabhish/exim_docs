'use client';

import React from 'react';
import { EmptyState } from '@exim/ui';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <EmptyState
      title={title}
      description="This module is under development and will be available soon."
    />
  );
}
