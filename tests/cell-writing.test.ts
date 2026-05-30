import { describe, expect, test } from 'vitest'
import { CONTENT_LIMIT } from '../src/domain/cells/constants'
import {
  getCellCreateFailureMessage,
  getCellWriteReadiness,
  prepareCellWrite,
} from '../src/domain/cells/cellWriting'
import type { Cell } from '../src/domain/cells/types'

const existingCell: Cell = {
  id: 'existing-cell',
  x: 2,
  y: -1,
  blocks: [{ id: 'existing-cell:block', type: 'text', content: '已有内容' }],
  createdAt: '2026-05-29T10:00:00.000Z',
  tone: 'mint',
}

describe('Cell writing', () => {
  /**
   * 验证格子写入准备流程会整理正文、补默认类型并生成标题。
   *
   * 写入准备流程是前端和数据仓库共用的 Module，用来避免重复判断正文规则。
   */
  test('准备可写入格子数据', () => {
    expect(
      prepareCellWrite({
        x: -3,
        y: 5,
        content: '  第一行\n第二行  ',
      }),
    ).toEqual({
      status: 'ready',
      write: {
        x: -3,
        y: 5,
        type: 'THOUGHT',
        title: '第一行',
        content: '第一行\n第二行',
      },
    })
  })

  /**
   * 验证格子写入准备流程会用稳定状态表达空内容、超长内容和坐标占用。
   *
   * 稳定状态指调用方只需要判断 status 字段，不需要知道具体校验实现。
   */
  test('返回可判定的写入阻止状态', () => {
    expect(prepareCellWrite({ x: 0, y: 0, content: '   ' })).toEqual({ status: 'empty-content' })
    expect(prepareCellWrite({ x: 0, y: 0, content: 'x'.repeat(CONTENT_LIMIT + 1) })).toEqual({
      status: 'too-long',
    })
    expect(prepareCellWrite({ x: 2, y: -1, content: '新内容' }, [existingCell])).toEqual({
      status: 'occupied',
    })
  })

  /**
   * 验证编辑面板和提交流程会共享同一份 readiness。
   *
   * readiness 指当前草稿是否可提交、字数状态和失败提示的组合状态。
   */
  test('生成编辑面板可直接消费的写入 readiness', () => {
    expect(getCellWriteReadiness({ x: 0, y: 0, content: '新想法' })).toMatchObject({
      canSubmit: true,
      length: 3,
      limit: CONTENT_LIMIT,
      message: null,
      result: {
        status: 'ready',
      },
    })
    expect(getCellWriteReadiness({ x: 2, y: -1, content: '新想法' }, [existingCell])).toMatchObject({
      canSubmit: false,
      message: '这个格子已经有内容了，换一个空格子试试。',
      result: {
        status: 'occupied',
      },
    })
  })

  /**
   * 验证持久化写入失败状态会集中翻译为用户提示。
   *
   * @returns 无返回值，断言后端或网络失败不会在界面调用方分散处理。
   */
  test('生成创建失败提示', () => {
    expect(getCellCreateFailureMessage('invalid-content')).toBe('内容为空或超过上限，调整后再写入。')
    expect(getCellCreateFailureMessage('occupied')).toBe('这个格子刚刚被占用了，换一个空格子试试。')
    expect(getCellCreateFailureMessage('request-failed')).toBe('写入失败，请稍后再试。')
  })
})
