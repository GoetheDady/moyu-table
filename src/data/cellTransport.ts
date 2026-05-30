import type { CreatePersistedCellResult } from './cellRepository'
import type { Cell } from '../domain/cells/types'

/** 表示创建格子的 HTTP 响应，集中描述状态码和响应体的对应关系。 */
export type CreateCellHttpResponse =
  | { status: 201; body: { cell: Cell } }
  | { status: 400; body: { error: string } }
  | { status: 409; body: { error: string } }

/** 表示浏览器端创建格子时可恢复处理的失败状态。 */
export type CreateClientCellFailureStatus = 'invalid-content' | 'occupied' | 'request-failed'

/**
 * 将数据仓库创建结果转换为 HTTP 响应契约。
 *
 * @param result 数据仓库返回的创建结果。
 * @returns Next.js route 可以直接序列化的状态码和响应体。
 */
export function toCreateCellHttpResponse(result: CreatePersistedCellResult): CreateCellHttpResponse {
  if (result.status === 'created') {
    return { status: 201, body: { cell: result.cell } }
  }

  if (result.status === 'invalid-content') {
    return { status: 400, body: { error: '格子内容不合法' } }
  }

  return { status: 409, body: { error: '这个格子已经被占用' } }
}

/**
 * 将创建格子的 HTTP 响应状态转换为客户端失败状态。
 *
 * @param response fetch 返回的响应状态信息。
 * @returns null 表示 HTTP 层成功；否则返回客户端可直接处理的失败状态。
 */
export function getCreateClientFailureStatus(response: Pick<Response, 'ok' | 'status'>): CreateClientCellFailureStatus | null {
  if (response.status === 400) {
    return 'invalid-content'
  }

  if (response.status === 409) {
    return 'occupied'
  }

  if (!response.ok) {
    return 'request-failed'
  }

  return null
}
