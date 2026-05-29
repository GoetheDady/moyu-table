import { CONTENT_LIMIT } from './constants'
import { coordKey } from './geometry'
import type { Cell, Coord } from './types'

/** 表示一次格子写入前置检查的结果。 */
export type CellAuthoringCheckResult =
  | { status: 'ready' }
  | { status: 'empty-draft' }
  | { status: 'too-long' }
  | { status: 'occupied' }

/**
 * 获取当前草稿是否可以提交以及字数状态。
 *
 * @param draft 用户正在编辑的原始文本。
 * @returns 包含是否可提交、当前长度和最大长度的状态对象。
 */
export function getDraftAuthoringState(draft: string) {
  return {
    canSubmit: draft.trim().length > 0 && draft.length <= CONTENT_LIMIT,
    length: draft.length,
    limit: CONTENT_LIMIT,
  }
}

/**
 * 检查当前草稿是否可以提交给持久化写入流程。
 *
 * @param cells 当前已有内容的单元格列表。
 * @param coord 目标单元格坐标。
 * @param draft 用户输入的草稿文本。
 * @returns ready 表示可以提交；其他状态表示需要阻止提交。
 *
 * 边界条件：这里只做前端体验用的快速检查，最终是否写入成功以服务端持久化结果为准。
 */
export function checkCellAuthoring(cells: Cell[], coord: Coord, draft: string): CellAuthoringCheckResult {
  if (!draft.trim()) {
    return { status: 'empty-draft' }
  }

  if (draft.length > CONTENT_LIMIT) {
    return { status: 'too-long' }
  }

  if (cells.some((cell) => coordKey(cell) === coordKey(coord))) {
    return { status: 'occupied' }
  }

  return { status: 'ready' }
}
