import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // 核心修复：锁定 Output File Tracing 范围
  experimental: {
    outputFileTracingRoot: __dirname,
    outputFileTracingExcludes: {
      '*': [
        '**/AppData/**',
        'C:/Users/**',
        '**/.git/**'
      ]
    }
  },

  webpack: (config) => {
    // 强制 Webpack 锁死在当前 G 盘目录下，严禁向上漂移
    config.context = __dirname;
    return config;
  },
};

export default nextConfig;
