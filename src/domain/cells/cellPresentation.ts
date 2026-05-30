import {
  getCellBlockContent,
  getCellBlockSubtitle,
  getCellBlockTitle,
  getCellBlockTypeLabel,
  getCellContentTypeLabel,
  getContentBodyWithoutTitle,
  getContentSubtitle,
  getContentTitle,
  type CellContentType,
} from './cellContent'
import type { Cell, CellBlock, CellPreview, CellTone, Coord } from './types'

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

/** 表示阅读面板可直接消费的格子展示数据。 */
export type CellDetail = {
  preview: CellPreview
  primaryBlock: CellBlock | null
  body: string
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
 * 生成格子未点开时展示的封面预览。
 *
 * @param cell 需要生成封面的格子。
 * @returns 可供 Canvas、阅读面板或未来卡片渲染的封面预览信息。
 */
export function getCellPreview(cell: Cell): CellPreview {
  if (cell.previewOverride) {
    return cell.previewOverride
  }

  const primaryBlock = getPrimaryBlock(cell)
  const template = primaryBlock?.type ?? 'text'

  return {
    source: 'template',
    template,
    title: getCellBlockTitle(primaryBlock),
    subtitle: getCellBlockSubtitle(primaryBlock),
    label: getCellBlockTypeLabel(template),
  }
}

/**
 * 获取格子的主内容块。
 *
 * @param cell 需要读取的格子。
 * @returns blocks 中的第一个内容块；如果没有内容块则返回 null。
 */
export function getPrimaryBlock(cell: Cell): CellBlock | null {
  return cell.blocks[0] ?? null
}

/**
 * 读取内容块的正文文本。
 *
 * @param block 需要读取的内容块，可以为空。
 * @returns 内容块正文；没有正文时返回空字符串。
 */
export function getBlockContent(block: CellBlock | null | undefined): string {
  return getCellBlockContent(block)
}

/**
 * 生成阅读面板需要的格子详情展示数据。
 *
 * @param cell 需要展示的格子。
 * @returns 包含封面、主内容块和去掉标题后的正文。
 */
export function getCellDetail(cell: Cell): CellDetail {
  const primaryBlock = getPrimaryBlock(cell)
  const preview = getCellPreview(cell)

  return {
    preview,
    primaryBlock,
    body: getContentBodyWithoutTitle(getBlockContent(primaryBlock), preview.title),
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
    label: getCellContentTypeLabel(cell.type),
  }
}
