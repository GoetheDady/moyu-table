import type { Cell, CellBlock, CellBlockType, CellPreview } from './types.js'

const TYPE_LABELS: Record<CellBlockType, string> = {
  text: '文字',
  question: '问题',
  image: '图片',
  artText: '艺术字',
  drawing: '画图',
}

const FALLBACK_TITLES: Record<CellBlockType, string> = {
  text: '未命名文字',
  question: '未命名问题',
  image: '图片内容',
  artText: '艺术字',
  drawing: '画图草稿',
}

/**
 * 生成单元格未点开时展示的封面预览。
 *
 * @param cell 需要生成封面的单元格。
 * @returns 可供 Canvas 或未来卡片组件渲染的封面预览信息。
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
    title: getBlockTitle(primaryBlock),
    subtitle: getBlockSubtitle(primaryBlock),
    label: TYPE_LABELS[template],
  }
}

/**
 * 获取单元格的主内容块。
 *
 * @param cell 需要读取的单元格。
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
  return block?.content?.trim() ?? ''
}

/**
 * 从内容块中生成封面标题。
 *
 * @param block 需要提取标题的内容块，可以为空。
 * @returns 优先使用显式 title，其次使用正文第一行，最后使用类型兜底标题。
 */
function getBlockTitle(block: CellBlock | null): string {
  if (!block) {
    return FALLBACK_TITLES.text
  }

  const title = block.title?.trim() || getContentLines(block)[0]
  return title || FALLBACK_TITLES[block.type]
}

/**
 * 从内容块正文中生成封面副标题。
 *
 * @param block 需要提取副标题的内容块，可以为空。
 * @returns 正文第二行或后续摘要；没有可用内容时返回 undefined。
 */
function getBlockSubtitle(block: CellBlock | null): string | undefined {
  if (!block) {
    return undefined
  }

  const lines = getContentLines(block)
  const subtitle = block.title ? lines[0] : lines.slice(1).join(' ')
  return subtitle || undefined
}

/**
 * 把内容块正文拆成可用于封面的非空行。
 *
 * @param block 需要拆分的内容块。
 * @returns 已去除首尾空白的非空文本行。
 */
function getContentLines(block: CellBlock): string[] {
  return getBlockContent(block)
    .split(/\s*\n\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
}
