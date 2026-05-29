import type { Metadata } from 'next'
import '../src/index.css'

export const metadata: Metadata = {
  title: '摸鱼表格',
  description: '上班摸鱼时可以随便逛逛、写想法、记笔记，也能偶尔当树洞用的无限格子墙。',
}

/**
 * 渲染 Next.js 全局根布局。
 *
 * @param props.children 当前路由页面内容。
 * @returns 包含语言、页面主体和全局样式的根布局。
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
