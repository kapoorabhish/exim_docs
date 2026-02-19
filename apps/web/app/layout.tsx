'use client';

import React from 'react';
import { ThemeProvider } from '@exim/ui';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>EXIM - Export Import Management</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0 }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
