import { describe, expect, test } from 'vitest'
import { getCellDetail, toWallCell } from '../src/domain/cells/cellPresentation'

describe('Cell presentation', () => {
  /**
   * 验证持久化格子会被转换为墙面和阅读面板使用的 Cell 结构。
   *
   * 展示映射指把底层数据整理成界面可直接使用的数据结构。
   */
  test('把持久化格子映射为墙面格子', () => {
    const createdAt = new Date('2026-05-29T11:00:00.000Z')

    const cell = toWallCell({
      id: 'cell-note',
      x: 2,
      y: -3,
      type: 'NOTE',
      title: '读书笔记',
      content: '读书笔记\n第二行',
      createdAt,
    })

    expect(cell).toMatchObject({
      id: 'cell-note',
      x: 2,
      y: -3,
      createdAt: createdAt.toISOString(),
      blocks: [
        {
          id: 'block:text:cell-note',
          type: 'text',
          title: '读书笔记',
          content: '读书笔记\n第二行',
        },
      ],
      previewOverride: {
        source: 'template',
        template: 'text',
        title: '读书笔记',
        subtitle: '第二行',
        label: '笔记',
      },
    })
    expect(['mint', 'amber', 'cyan', 'coral']).toContain(cell.tone)
  })

  /**
   * 验证没有显式标题时，会从正文第一行生成标题。
   *
   * @returns 无返回值，断言标题和副标题来自正文。
   */
  test('从正文生成封面标题和副标题', () => {
    const cell = toWallCell({
      id: 'cell-tree-hole',
      x: -1,
      y: 4,
      type: 'TREE_HOLE',
      title: null,
      content: '  不想开会  \n  想喝咖啡  ',
      createdAt: new Date('2026-05-29T12:00:00.000Z'),
    })

    expect(cell.previewOverride).toMatchObject({
      title: '不想开会',
      subtitle: '想喝咖啡',
      label: '树洞',
    })
  })

  /**
   * 验证阅读面板详情会复用统一的格子展示语言。
   *
   * 展示语言指标题、副标题、标签和正文拆分这些界面含义，不应该分散在多个调用方里。
   */
  test('生成阅读面板详情数据', () => {
    const cell = toWallCell({
      id: 'cell-detail',
      x: 0,
      y: 0,
      type: 'QUESTION',
      title: null,
      content: '  今天吃什么  \n  想吃面  ',
      createdAt: new Date('2026-05-29T12:00:00.000Z'),
    })

    expect(getCellDetail(cell)).toMatchObject({
      preview: {
        title: '今天吃什么',
        subtitle: '想吃面',
        label: '提问',
      },
      body: '想吃面',
    })
  })
})
