import React from 'react';
import { ConfigProvider, App } from 'antd';
import { antdTheme } from '../tokens/antdTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ConfigProvider theme={antdTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
