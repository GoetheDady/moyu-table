import { describe, expect, test } from 'vitest'
import { getCreateClientFailureStatus, toCreateCellHttpResponse } from '../src/data/cellTransport'
import type { Cell } from '../src/domain/cells/types'

const createdCell: Cell = {
  id: 'transport-cell',
  x: 1,
  y: -2,
  blocks: [{ id: 'transport-cell:block', type: 'text', content: '传输测试' }],
  createdAt: '2026-05-29T10:00:00.000Z',
  tone: 'mint',
}

describe('Cell transport contract', () => {
  /**
   * 验证数据仓库创建结果会被集中翻译为 HTTP 状态码和响应体。
   *
   * HTTP 契约是前后端共享的状态码含义，集中后 route 不需要知道每个失败分支的文案。
   */
  test('把数据仓库创建结果转换为 HTTP 响应', () => {
    expect(toCreateCellHttpResponse({ status: 'created', cell: createdCell })).toEqual({
      status: 201,
      body: { cell: createdCell },
    })
    expect(toCreateCellHttpResponse({ status: 'invalid-content' })).toEqual({
      status: 400,
      body: { error: '格子内容不合法' },
    })
    expect(toCreateCellHttpResponse({ status: 'occupied' })).toEqual({
      status: 409,
      body: { error: '这个格子已经被占用' },
    })
  })

  /**
   * 验证客户端只通过共享契约识别创建失败状态。
   *
   * @returns 无返回值，断言 400、409 和其他失败状态不会在客户端重复硬编码。
   */
  test('把 HTTP 响应状态转换为客户端失败状态', () => {
    expect(getCreateClientFailureStatus({ status: 201, ok: true })).toBeNull()
    expect(getCreateClientFailureStatus({ status: 400, ok: false })).toBe('invalid-content')
    expect(getCreateClientFailureStatus({ status: 409, ok: false })).toBe('occupied')
    expect(getCreateClientFailureStatus({ status: 500, ok: false })).toBe('request-failed')
  })
})
