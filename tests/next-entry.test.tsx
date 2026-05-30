import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { SessionProvider } from 'next-auth/react'
import HomePage from '../app/page'

describe('Next.js 入口', () => {
  /**
   * 验证 Next.js 首页仍然承载无限格子墙主体验。
   *
   * @returns 无返回值，断言首页静态渲染结果包含格子墙的可访问名称。
   */
  test('首页渲染无限格子墙', async () => {
    const element = await HomePage()
    const html = renderToStaticMarkup(<SessionProvider>{element}</SessionProvider>)

    expect(html).toContain('moyuTable infinite collaborative wall')
  })
})
