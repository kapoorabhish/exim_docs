import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@exim/ui', '@exim/shared', 'antd', '@ant-design/icons'],
};

export default nextConfig;
