import { describe, expect, test } from 'vitest'
import { getCellDetail, getCellPreview } from '../src/domain/cells/cellContent'
import type { Cell } from '../src/domain/cells/types'

describe('Cell content 展示', () => {
  /**
   * 验证阅读面板详情会复用统一的格子展示语言。
   */
  test('生成阅读面板详情数据', () => {
    const cell: Cell = {
      id: 'cell-detail',
      x: 0,
      y: 0,
      blocks: [
        {
          id: 'block:text:cell-detail',
          type: 'text',
          content: '  今天吃什么  \n  想吃面  ',
        },
      ],
      previewOverride: undefined,
      createdAt: '2026-05-29T12:00:00.000Z',
      tone: 'mint',
    }

    expect(getCellDetail(cell)).toMatchObject({
      preview: {
        title: '今天吃什么',
        subtitle: '想吃面',
        label: '文字',
      },
      body: '想吃面',
    })
  })

  /**
   * 验证手动封面配置会优先于自动封面生成。
   */
  test('优先使用手动封面配置', () => {
    const cell: Cell = {
      id: 'cell-custom',
      x: 0,
      y: 0,
      blocks: [],
      previewOverride: {
        source: 'template',
        template: 'question',
        title: '自定义封面',
        label: '问题',
      },
      createdAt: '2026-05-29T12:00:00.000Z',
      tone: 'coral',
    }

    expect(getCellPreview(cell)).toMatchObject({
      template: 'question',
      title: '自定义封面',
      label: '问题',
    })
  })

  /**
   * 验证从空白内容块自动生成封面时使用兜底标题。
   */
  test('空白内容使用时自动生成兜底封面', () => {
    const cell: Cell = {
      id: 'cell-empty',
      x: 0,
      y: 0,
      blocks: [
        {
          id: 'block:text:cell-empty',
          type: 'text',
          content: '',
        },
      ],
      previewOverride: undefined,
      createdAt: '2026-05-29T12:00:00.000Z',
      tone: 'amber',
    }

    expect(getCellPreview(cell)).toMatchObject({
      source: 'template',
      template: 'text',
      title: '未命名文字',
      label: '文字',
    })
  })
})
