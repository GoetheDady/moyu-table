import { CONTENT_LIMIT } from './constants'
import { getContentTitle, type CellContentType } from './cellContent'
import { coordKey } from './geometry'
import type { Cell, Coord } from './types'

/** 表示准备写入格子时收到的原始输入。 */
export type CellWriteInput = {
  x: number
  y: number
  type?: CellContentType
  content: string
}

/** 表示已经整理好、可以交给持久化适配器写入的格子数据。 */
export type PreparedCellWrite = {
  x: number
  y: number
  type: CellContentType
  title: string
  content: string
}

/** 表示格子写入准备流程的结果，调用方不需要重复判断正文和坐标规则。 */
export type CellWriteCheckResult =
  | { status: 'ready'; write: PreparedCellWrite }
  | { status: 'empty-content' }
  | { status: 'too-long' }
  | { status: 'occupied' }

/** 表示编辑面板可直接使用的格子写入 readiness。 */
export type CellWriteReadiness = {
  canSubmit: boolean
  length: number
  limit: number
  result: CellWriteCheckResult
  message: string | null
}

export type CellCreateFailureStatus = 'invalid-content' | 'occupied' | 'request-failed'

/**
 * 准备一次格子写入。
 *
 * @param input 用户提交的原始坐标、内容类型和正文。
 * @param existingCells 当前已知的格子列表；传入时会做前端体验用的占用检查。
 * @returns ready 时包含整理后的写入数据；其他状态表示应该阻止写入。
 *
 * 边界条件：existingCells 只用于前端快速检查，最终坐标是否被占用仍以持久化结果为准。
 */
export function prepareCellWrite(input: CellWriteInput, existingCells: Cell[] = []): CellWriteCheckResult {
  const content = normalizeCellWriteContent(input.content)

  if (!content) {
    return { status: 'empty-content' }
  }

  if (content.length > CONTENT_LIMIT) {
    return { status: 'too-long' }
  }

  const coord: Coord = { x: input.x, y: input.y }

  if (existingCells.some((cell) => coordKey(cell) === coordKey(coord))) {
    return { status: 'occupied' }
  }

  return {
    status: 'ready',
    write: {
      ...coord,
      type: input.type ?? 'THOUGHT',
      title: getContentTitle(content),
      content,
    },
  }
}

/**
 * 计算编辑面板和提交流程共用的格子写入 readiness。
 *
 * @param input 用户提交的原始坐标、内容类型和正文。
 * @param existingCells 当前已知的格子列表；传入时会做前端体验用的占用检查。
 * @returns 包含字数状态、是否可提交、准备结果和失败提示的 readiness。
 */
export function getCellWriteReadiness(input: CellWriteInput, existingCells: Cell[] = []): CellWriteReadiness {
  const result = prepareCellWrite(input, existingCells)

  return {
    canSubmit: result.status === 'ready',
    length: input.content.length,
    limit: CONTENT_LIMIT,
    result,
    message: result.status === 'ready' ? null : getCellWriteFailureMessage(result.status),
  }
}

/**
 * 将格子写入 readiness 失败状态转换为用户可读提示。
 *
 * @param status 写入准备失败状态。
 * @returns 可以显示在编辑面板里的错误提示。
 */
export function getCellWriteFailureMessage(status: Exclude<CellWriteCheckResult['status'], 'ready'>): string {
  if (status === 'empty-content') {
    return '先写点内容再锁定这个格子。'
  }

  if (status === 'too-long') {
    return '内容超过字数上限，删短一点再试。'
  }

  return '这个格子已经有内容了，换一个空格子试试。'
}

/**
 * 将持久化写入失败状态转换为用户可读提示。
 *
 * @param status 写入请求或持久化失败状态。
 * @returns 可以显示在编辑面板里的错误提示。
 */
export function getCellCreateFailureMessage(status: CellCreateFailureStatus): string {
  if (status === 'invalid-content') {
    return '内容为空或超过上限，调整后再写入。'
  }

  if (status === 'occupied') {
    return '这个格子刚刚被占用了，换一个空格子试试。'
  }

  return '写入失败，请稍后再试。'
}

/**
 * 整理用户输入的格子正文。
 *
 * @param content 用户提交的原始正文。
 * @returns 去掉首尾空白后的正文；如果正文为空则返回 null。
 */
function normalizeCellWriteContent(content: string): string | null {
  const trimmed = content.trim()

  return trimmed || null
}
