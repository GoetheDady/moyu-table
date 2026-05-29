import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 允许本地开发时用 127.0.0.1 访问 Next.js 热更新资源，避免 HMR 跨源拦截。
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
