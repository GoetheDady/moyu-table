import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { MouseCoordDisplay } from '../src/features/wall/MouseCoordDisplay'

describe('MouseCoordDisplay', () => {
  /**
   * 验证鼠标悬停在格子上方时显示 cell 坐标。
   *
   * @returns 无返回值，断言渲染结果包含格式化后的坐标文本。
   */
  test('显示当前鼠标所在的 cell 坐标', () => {
    const html = renderToStaticMarkup(<MouseCoordDisplay coord={{ x: 3, y: -2 }} />)

    expect(html).toContain('x: 3')
    expect(html).toContain('y: -2')
  })

  /**
   * 验证鼠标不在画布上方时不渲染任何内容。
   *
   * @returns 无返回值，断言渲染结果为空字符串。
   */
  test('当 coord 为 null 时渲染空内容', () => {
    const html = renderToStaticMarkup(<MouseCoordDisplay coord={null} />)

    expect(html).toBe('')
  })

  /**
   * 验证坐标显示使用等宽字体。
   *
   * @returns 无返回值，断言渲染结果包含 font-mono 类名。
   */
  test('使用等宽字体显示坐标', () => {
    const html = renderToStaticMarkup(<MouseCoordDisplay coord={{ x: 0, y: 0 }} />)

    expect(html).toContain('font-mono')
  })
})
