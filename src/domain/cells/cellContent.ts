import type { Cell, CellBlock, CellBlockType, CellPreview } from './types'

export const cellContentTypes = ['THOUGHT', 'NOTE', 'QUESTION', 'TREE_HOLE'] as const

export type CellContentType = (typeof cellContentTypes)[number]

const cellContentTypeLabels: Record<CellContentType, string> = {
  THOUGHT: '随想',
  NOTE: '笔记',
  QUESTION: '提问',
  TREE_HOLE: '树洞',
}

const cellBlockTypeLabels: Record<CellBlockType, string> = {
  text: '文字',
  question: '问题',
  image: '图片',
  artText: '艺术字',
  drawing: '画图',
}

const cellBlockFallbackTitles: Record<CellBlockType, string> = {
  text: '未命名文字',
  question: '未命名问题',
  image: '图片内容',
  artText: '艺术字',
  drawing: '画图草稿',
}

/**
 * 读取持久化内容类型对应的中文标签。
 *
 * @param type 持久化格子的内容类型。
 * @returns 可用于封面或阅读面板的中文内容类型标签。
 */
export function getCellContentTypeLabel(type: CellContentType): string {
  return cellContentTypeLabels[type]
}

/**
 * 读取内容块类型对应的中文标签。
 *
 * @param type 内容块类型。
 * @returns 可用于封面或未来内容块选择器的中文标签。
 */
export function getCellBlockTypeLabel(type: CellBlockType): string {
  return cellBlockTypeLabels[type]
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
 * 从正文中提取封面副标题。
 *
 * @param content 格子正文。
 * @returns 正文第二行之后的摘要；没有可用内容时返回 undefined。
 */
export function getContentSubtitle(content: string): string | undefined {
  return getContentLines(content).slice(1).join(' ') || undefined
}

/**
 * 从内容块中生成封面标题。
 *
 * @param block 需要提取标题的内容块，可以为空。
 * @returns 优先使用显式 title，其次使用正文第一行，最后使用类型兜底标题。
 */
function getCellBlockTitle(block: CellBlock | null): string {
  if (!block) {
    return cellBlockFallbackTitles.text
  }

  const title = block.title?.trim() || getContentLines(getCellBlockContent(block))[0]
  return title || cellBlockFallbackTitles[block.type]
}

/**
 * 从内容块正文中生成封面副标题。
 *
 * @param block 需要提取副标题的内容块，可以为空。
 * @returns 正文第二行或后续摘要；没有可用内容时返回 undefined。
 */
function getCellBlockSubtitle(block: CellBlock | null): string | undefined {
  if (!block) {
    return undefined
  }

  const lines = getContentLines(getCellBlockContent(block))
  const subtitle = block.title ? lines[0] : lines.slice(1).join(' ')

  return subtitle || undefined
}

/**
 * 读取内容块的正文文本。
 *
 * @param block 需要读取的内容块，可以为空。
 * @returns 内容块正文；没有正文时返回空字符串。
 */
function getCellBlockContent(block: CellBlock | null | undefined): string {
  return block?.content?.trim() ?? ''
}

/**
 * 从完整正文中去掉已经作为标题展示的第一行。
 *
 * @param content 内容块完整正文。
 * @param title 当前详情标题。
 * @returns 标题之外的正文；如果正文只有标题，则返回空字符串。
 */
export function getContentBodyWithoutTitle(content: string, title: string): string {
  const lines = getContentLines(content)

  if (lines[0] === title) {
    return lines.slice(1).join('\n')
  }

  return content
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

/** 表示阅读面板可直接消费的格子展示数据。 */
export type CellDetail = {
  preview: CellPreview
  primaryBlock: CellBlock | null
  body: string
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
function getPrimaryBlock(cell: Cell): CellBlock | null {
  return cell.blocks[0] ?? null
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
    body: getContentBodyWithoutTitle(getCellBlockContent(primaryBlock), preview.title),
  }
}
