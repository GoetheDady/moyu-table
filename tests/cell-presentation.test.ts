import { describe, expect, test } from 'vitest'
import { cellContentTypes, getContentTitle, toWallCell } from '../src/domain/cells/cellPresentation'

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
   * 验证内容类型集合与当前第一版持久化类型保持一致。
   *
   * @returns 无返回值，断言允许的内容类型不会因为展示映射移动而丢失。
   */
  test('保留第一版持久化内容类型集合', () => {
    expect(cellContentTypes).toEqual(['THOUGHT', 'NOTE', 'QUESTION', 'TREE_HOLE'])
  })

  /**
   * 验证标题提取会忽略空白行。
   *
   * @returns 无返回值，断言标题来自第一个非空正文行。
   */
  test('从第一个非空正文行提取标题', () => {
    expect(getContentTitle(' \n  先写一句 \n 第二句')).toBe('先写一句')
    expect(getContentTitle('  \n  ')).toBe('未命名内容')
  })
})
