import { CONTENT_LIMIT } from './constants.js'
import { coordKey } from './geometry.js'
import type { Cell, CellTone, Coord } from './types.js'

/** 表示一次写入单元格操作的结果。 */
export type CellAuthoringResult =
  | { status: 'created'; cell: Cell }
  | { status: 'empty-draft' }
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
 * 尝试把草稿写入指定单元格。
 *
 * @param cells 当前已有内容的单元格列表。
 * @param coord 目标单元格坐标。
 * @param draft 用户输入的草稿文本。
 * @param now 可注入的当前时间函数，方便测试时固定时间。
 * @returns 创建成功、空草稿或目标已占用三种结果之一。
 */
export function authorCell(cells: Cell[], coord: Coord, draft: string, now = () => new Date()): CellAuthoringResult {
  const content = draft.trim()

  if (!content) {
    return { status: 'empty-draft' }
  }

  if (cells.some((cell) => coordKey(cell) === coordKey(coord))) {
    return { status: 'occupied' }
  }

  return {
    status: 'created',
    cell: {
      ...coord,
      content,
      createdAt: now().toISOString(),
      tone: pickTone(coord),
    },
  }
}

/**
 * 根据坐标稳定地选择一个单元格色调。
 *
 * @param coord 单元格坐标。
 * @returns 与坐标绑定的色调名称。
 */
function pickTone(coord: Coord): CellTone {
  const tones: CellTone[] = ['mint', 'amber', 'cyan', 'coral']
  return tones[Math.abs(coord.x * 7 + coord.y * 13) % tones.length]
}
