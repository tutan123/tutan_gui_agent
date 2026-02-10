import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  output: 'standalone',

  experimental: {
    outputFileTracingExcludes: {
      '*': [
        '**/AppData/**',
        'C:/Users/**',
        '**/.git/**'
      ]
    }
  },
  
  webpack: (config) => {
    config.context = __dirname;
    
    config.resolve.modules = [
      path.resolve(__dirname, '.'), // 修正为根目录
      path.resolve(__dirname, 'node_modules')
    ];

    config.externals = [...(config.externals || []), 'fsevents'];

    return config;
  },
};

export default nextConfig;
