import { describe, expect, test } from 'vitest'
import { createCellClient, type CellClientFetch } from '../src/data/cellClient'
import type { Cell } from '../src/domain/cells/types'

type FetchCall = {
  input: RequestInfo | URL
  init?: RequestInit
}

const exampleCell: Cell = {
  id: 'cell-client-1',
  x: -2,
  y: 7,
  blocks: [
    {
      id: 'block:text:cell-client-1',
      type: 'text',
      title: '客户端测试',
      content: '客户端测试',
    },
  ],
  previewOverride: {
    source: 'template',
    template: 'text',
    title: '客户端测试',
    label: '随想',
  },
  createdAt: '2026-05-29T13:00:00.000Z',
  tone: 'mint',
}

describe('Cell client', () => {
  /**
   * 验证客户端读取会拼接单元格范围查询参数，并隐藏 HTTP 响应解析细节。
   *
   * Cell client 是浏览器端数据访问 Module，用来让 React 组件只处理 typed result。
   * typed result 指带有明确 status 字段的结果对象，调用方不用直接判断状态码。
   */
  test('按范围读取格子并返回 loaded 结果', async () => {
    const { fetcher, calls } = createStaticFetch(jsonResponse({ cells: [exampleCell] }))
    const client = createCellClient(fetcher)
    const abortController = new AbortController()

    const result = await client.listCellsInRange(
      { minX: -3, maxX: 4, minY: 5, maxY: 9 },
      { signal: abortController.signal },
    )

    expect(calls).toHaveLength(1)
    expect(String(calls[0].input)).toBe('/api/cells?minX=-3&maxX=4&minY=5&maxY=9')
    expect(calls[0].init?.signal).toBe(abortController.signal)
    expect(result).toEqual({ status: 'loaded', cells: [exampleCell] })
  })

  /**
   * 验证读取失败和过期请求取消会被翻译成明确状态。
   *
   * 过期请求指视口变化后旧请求已经不需要继续完成，应该被静默忽略。
   */
  test('读取失败和取消请求时返回可判定状态', async () => {
    const failedClient = createCellClient(async () => jsonResponse({ error: '失败' }, 500))
    const abortedClient = createCellClient(async () => {
      throw new DOMException('请求已取消', 'AbortError')
    })

    await expect(failedClient.listCellsInRange({ minX: 0, maxX: 1, minY: 0, maxY: 1 })).resolves.toEqual({
      status: 'request-failed',
    })
    await expect(abortedClient.listCellsInRange({ minX: 0, maxX: 1, minY: 0, maxY: 1 })).resolves.toEqual({
      status: 'aborted',
    })
  })

  /**
   * 验证创建格子时，客户端会发送固定 POST 结构并返回后端创建的 Cell。
   *
   * POST 是 HTTP 写入请求方法，这里用来把用户草稿提交给后端。
   */
  test('创建格子时发送正文并返回 created 结果', async () => {
    const { fetcher, calls } = createStaticFetch(jsonResponse({ cell: exampleCell }, 201))
    const client = createCellClient(fetcher)

    const result = await client.createCell({
      x: -2,
      y: 7,
      content: ' 客户端测试 ',
    })

    expect(calls).toHaveLength(1)
    expect(String(calls[0].input)).toBe('/api/cells')
    expect(calls[0].init?.method).toBe('POST')
    expect(calls[0].init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      x: -2,
      y: 7,
      type: 'THOUGHT',
      content: ' 客户端测试 ',
    })
    expect(result).toEqual({ status: 'created', cell: exampleCell })
  })

  /**
   * 验证创建失败时，客户端会把 HTTP 状态码翻译成调用方可直接处理的状态。
   *
   * 409 表示坐标冲突，400 表示内容不合法，其他非成功响应统一视为请求失败。
   */
  test('创建格子时翻译内容错误、坐标冲突和请求失败', async () => {
    const invalidClient = createCellClient(async () => jsonResponse({ error: '内容不合法' }, 400))
    const occupiedClient = createCellClient(async () => jsonResponse({ error: '坐标已占用' }, 409))
    const failedClient = createCellClient(async () => jsonResponse({ error: '服务异常' }, 500))

    await expect(invalidClient.createCell({ x: 1, y: 2, content: '' })).resolves.toEqual({
      status: 'invalid-content',
    })
    await expect(occupiedClient.createCell({ x: 1, y: 2, content: '已经有人写了' })).resolves.toEqual({
      status: 'occupied',
    })
    await expect(failedClient.createCell({ x: 1, y: 2, content: '稍后再试' })).resolves.toEqual({
      status: 'request-failed',
    })
  })
})

/**
 * 创建一个记录调用参数并返回固定响应的 fetch 适配器。
 *
 * @param response 每次请求需要返回的 Response。
 * @returns 测试 fetcher 及其调用记录。
 */
function createStaticFetch(response: Response): { fetcher: CellClientFetch; calls: FetchCall[] } {
  const calls: FetchCall[] = []

  return {
    calls,
    fetcher: async (input, init) => {
      calls.push({ input, init })

      return response.clone()
    },
  }
}

/**
 * 创建 JSON 响应对象。
 *
 * @param body 需要序列化为 JSON 的响应体。
 * @param status HTTP 状态码，默认 200。
 * @returns 可被 fetch 调用方消费的 Response。
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
