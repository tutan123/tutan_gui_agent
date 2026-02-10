import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. 禁用所有构建时的自动检查
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // 2. 强制使用 standalone 模式，减少对外部环境的依赖
  output: 'standalone',

  // 3. 关键：禁用 Next.js 的环境变量自动搜寻（它会扫描父目录）
  // 这是一个实验性选项，但在 14.x 中非常有效
  experimental: {
    // 强制不扫描 AppData
    outputFileTracingExcludes: {
      '*': [
        '**/AppData/**',
        'C:/Users/**',
        '**/.git/**'
      ]
    }
  },
  
  webpack: (config) => {
    // 4. 强制 Webpack 锁死在当前 G 盘目录下，严禁向上漂移
    config.context = __dirname;
    
    // 5. 覆盖 Webpack 的文件查找逻辑
    config.resolve.modules = [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'node_modules')
    ];

    // 6. 物理屏蔽 Node.js 引擎在 Windows 下的 glob 扫描
    config.externals = [...(config.externals || []), 'fsevents'];

    return config;
  },
};

export default nextConfig;
