import { CONTENT_LIMIT } from './constants'
import { coordKey } from './geometry'
import type { Cell, CellBlock, CellTone, Coord } from './types'

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

  const createdAt = now().toISOString()

  return {
    status: 'created',
    cell: {
      ...coord,
      id: createCellId(coord, createdAt),
      blocks: [createTextBlock(content, createdAt)],
      createdAt,
      tone: getCellToneForCoord(coord),
    },
  }
}

/**
 * 为新单元格创建稳定 id。
 *
 * @param coord 单元格坐标。
 * @param createdAt 单元格创建时间。
 * @returns 包含坐标和时间的单元格 id。
 */
function createCellId(coord: Coord, createdAt: string): string {
  return `cell:${coord.x}:${coord.y}:${createdAt}`
}

/**
 * 把用户草稿包装成第一版支持的文字内容块。
 *
 * @param content 已经 trim 过的文本内容。
 * @param createdAt 单元格创建时间，用于生成稳定 block id。
 * @returns text 类型内容块。
 */
function createTextBlock(content: string, createdAt: string): CellBlock {
  return {
    id: `block:text:${createdAt}`,
    type: 'text',
    content,
  }
}

/**
 * 根据坐标稳定地选择一个单元格色调。
 *
 * @param coord 单元格坐标。
 * @returns 与坐标绑定的色调名称。
 */
export function getCellToneForCoord(coord: Coord): CellTone {
  const tones: CellTone[] = ['mint', 'amber', 'cyan', 'coral']
  return tones[Math.abs(coord.x * 7 + coord.y * 13) % tones.length]
}
