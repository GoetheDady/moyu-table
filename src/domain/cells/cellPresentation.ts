import type { Cell, CellPreview, CellTone, Coord } from './types'

export const cellContentTypes = ['THOUGHT', 'NOTE', 'QUESTION', 'TREE_HOLE'] as const

export type CellContentType = (typeof cellContentTypes)[number]

/**
 * 表示展示层需要消费的持久化格子记录。
 *
 * 该类型只描述从数据库或测试适配器读取出的最小字段，不绑定具体 ORM。
 */
export type CellPresentationRecord = {
  id: string
  x: number
  y: number
  type: CellContentType
  title: string | null
  content: string
  createdAt: Date
}

const cellTypeLabels: Record<CellContentType, string> = {
  THOUGHT: '随想',
  NOTE: '笔记',
  QUESTION: '提问',
  TREE_HOLE: '树洞',
}

/**
 * 将持久化格子转换成前端画布使用的 Cell 结构。
 *
 * @param cell 数据库或测试适配器返回的格子记录。
 * @returns 前端画布和阅读面板可直接使用的格子结构。
 */
export function toWallCell(cell: CellPresentationRecord): Cell {
  const coord: Coord = { x: cell.x, y: cell.y }

  return {
    ...coord,
    id: cell.id,
    blocks: [
      {
        id: `block:text:${cell.id}`,
        type: 'text',
        title: cell.title ?? undefined,
        content: cell.content,
      },
    ],
    previewOverride: toCellPreview(cell),
    createdAt: cell.createdAt.toISOString(),
    tone: getCellToneForCoord(coord),
  }
}

/**
 * 从正文中提取封面标题。
 *
 * @param content 格子正文。
 * @returns 正文第一行；没有可用行时返回未命名内容。
 */
export function getContentTitle(content: string): string {
  return getContentLines(content)[0] || '未命名内容'
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

/**
 * 为持久化格子生成前端封面配置。
 *
 * @param cell 数据库或测试适配器返回的格子记录。
 * @returns 格子封面配置，用于显示随想、笔记、提问或树洞标签。
 */
function toCellPreview(cell: CellPresentationRecord): CellPreview {
  return {
    source: 'template',
    template: 'text',
    title: cell.title || getContentTitle(cell.content),
    subtitle: getContentSubtitle(cell.content),
    label: cellTypeLabels[cell.type],
  }
}

/**
 * 从正文中提取封面副标题。
 *
 * @param content 格子正文。
 * @returns 正文第二行之后的摘要；没有可用内容时返回 undefined。
 */
function getContentSubtitle(content: string): string | undefined {
  return getContentLines(content).slice(1).join(' ') || undefined
}

/**
 * 将正文拆成已清理空白的非空行。
 *
 * @param content 格子正文。
 * @returns 非空正文行。
 */
function getContentLines(content: string): string[] {
  return content
    .split(/\s*\n\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
}
