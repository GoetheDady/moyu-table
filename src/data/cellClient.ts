import { getCreateClientFailureStatus, type CreateClientCellFailureStatus } from './cellTransport'
import type { CellContentType } from '../domain/cells/cellContent'
import type { CellRange } from '../domain/cells/geometry'
import type { Cell } from '../domain/cells/types'

/** 表示浏览器端 Cell 请求使用的 fetch 适配器。 */
export type CellClientFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** 表示浏览器端创建格子的输入。 */
type CreateClientCellInput = {
  x: number
  y: number
  type?: CellContentType
  content: string
}

/** 表示读取可见格子的结果，调用方不需要解析 HTTP 状态和 JSON 结构。 */
export type ListClientCellsResult =
  | { status: 'loaded'; cells: Cell[] }
  | { status: 'request-failed' }
  | { status: 'aborted' }

/** 表示浏览器端写入格子的结果，调用方不需要知道后端状态码。 */
export type CreateClientCellResult =
  | { status: 'created'; cell: Cell }
  | { status: CreateClientCellFailureStatus }

/** 表示浏览器端格子数据访问 Module 的完整 Interface。 */
export type CellClient = ReturnType<typeof createCellClient>

type ListCellsPayload = {
  cells: Cell[]
}

type CreateCellPayload = {
  cell: Cell
}

/**
 * 创建浏览器端格子数据访问 Module。
 *
 * @param fetcher 用于发送 HTTP 请求的适配器，默认使用浏览器全局 fetch；测试可注入假适配器。
 * @returns 提供读取可见格子和创建格子的客户端数据访问方法。
 */
export function createCellClient(fetcher: CellClientFetch = fetch) {
  return {
    /**
     * 读取指定单元格坐标范围内的格子。
     *
     * @param range 需要读取的单元格坐标范围，y 使用用户可见的向上递增方向。
     * @param options 可选请求配置，目前用于传入 AbortSignal 取消过期请求。
     * @returns loaded、request-failed 或 aborted 结果，避免 React 组件直接解析 HTTP 响应。
     *
     * 副作用：会通过 fetcher 访问 `/api/cells`。
     */
    async listCellsInRange(
      range: CellRange,
      options: { signal?: AbortSignal } = {},
    ): Promise<ListClientCellsResult> {
      const params = new URLSearchParams({
        minX: String(range.minX),
        maxX: String(range.maxX),
        minY: String(range.minY),
        maxY: String(range.maxY),
      })

      try {
        const response = await fetcher(`/api/cells?${params.toString()}`, { signal: options.signal })

        if (!response.ok) {
          return { status: 'request-failed' }
        }

        const payload = (await response.json()) as Partial<ListCellsPayload>

        if (!Array.isArray(payload.cells)) {
          return { status: 'request-failed' }
        }

        return { status: 'loaded', cells: payload.cells }
      } catch (error) {
        if (isAbortError(error)) {
          return { status: 'aborted' }
        }

        return { status: 'request-failed' }
      }
    },

    /**
     * 创建一个新的持久化格子。
     *
     * @param input 目标坐标、内容类型和正文内容。
     * @returns 创建成功、内容不合法、坐标已占用或请求失败结果。
     *
     * 副作用：会向 `/api/cells` 发起 POST 请求，成功时后端会写入数据库。
     */
    async createCell(input: CreateClientCellInput): Promise<CreateClientCellResult> {
      try {
        const response = await fetcher('/api/cells', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x: input.x,
            y: input.y,
            type: input.type ?? 'THOUGHT',
            content: input.content,
          }),
        })

        const failureStatus = getCreateClientFailureStatus(response)
        if (failureStatus) {
          return { status: failureStatus }
        }

        const payload = (await response.json()) as Partial<CreateCellPayload>

        if (!payload.cell) {
          return { status: 'request-failed' }
        }

        return { status: 'created', cell: payload.cell }
      } catch {
        return { status: 'request-failed' }
      }
    },
  }
}

/**
 * 判断请求错误是否来自浏览器主动取消。
 *
 * @param error 捕获到的未知错误。
 * @returns 如果错误是 AbortError，则返回 true。
 */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
