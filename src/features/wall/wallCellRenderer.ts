import { getCellPreview } from '../../domain/cells/cellContent'
import { toneMap } from '../../domain/cells/cellStyle'
import { clamp, type PerspectiveGrid } from '../../domain/cells/geometry'
import { getProjectedTextBox, type ProjectedTextBox } from '../../domain/cells/text'
import type { Cell, Coord } from '../../domain/cells/types'

/**
 * 根据四个投影点绘制一个向中心收缩后的单元格路径。
 */
export function drawCellPath(
  context: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  inset: number,
) {
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length

  context.beginPath()
  points.forEach((point, index) => {
    const dx = point.x - centerX
    const dy = point.y - centerY
    const length = Math.hypot(dx, dy) || 1
    const nextPoint = {
      x: point.x - (dx / length) * inset,
      y: point.y - (dy / length) * inset,
    }

    if (index === 0) {
      context.moveTo(nextPoint.x, nextPoint.y)
    } else {
      context.lineTo(nextPoint.x, nextPoint.y)
    }
  })
  context.closePath()
}

/**
 * 在 Canvas 上按字符测量宽度并绘制自动换行文本。
 */
export function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    let line = ''

    for (const char of paragraph) {
      const nextLine = line + char
      if (context.measureText(nextLine).width > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = nextLine
      }

      if (lines.length >= maxLines) break
    }

    if (lines.length >= maxLines) break
    lines.push(line)
  }

  const visibleLines = lines.slice(0, maxLines)
  visibleLines.forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : ''
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight)
  })
}

/**
 * 在投影后的单元格局部坐标系中绘制自动换行文本。
 */
export function drawProjectedWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  box: ProjectedTextBox,
  paddingX: number,
  paddingY: number,
  lineHeight: number,
  maxLines: number,
) {
  const contentWidth = Math.max(1, box.width - paddingX * 2)

  context.save()
  context.transform(box.xAxis.x, box.xAxis.y, box.yAxis.x, box.yAxis.y, box.origin.x, box.origin.y)
  drawWrappedText(context, text, paddingX, paddingY, contentWidth, lineHeight, maxLines)
  context.restore()
}

/**
 * 为投影后的封面卡片创建线性渐变。
 */
export function createCoverGradient(
  context: CanvasRenderingContext2D,
  box: ProjectedTextBox,
  tone: { coverTop: string; coverBottom: string },
): CanvasGradient {
  const gradient = context.createLinearGradient(box.origin.x, box.origin.y, box.origin.x, box.origin.y + box.height)
  gradient.addColorStop(0, tone.coverTop)
  gradient.addColorStop(1, tone.coverBottom)
  return gradient
}

/**
 * 在投影格子中绘制封面内容。
 */
export function drawProjectedCover(
  context: CanvasRenderingContext2D,
  title: string,
  subtitle: string | undefined,
  label: string,
  box: ProjectedTextBox,
  paddingX: number,
  paddingY: number,
  tone: {
    coverAccent: string
    coverText: string
    coverMuted: string
  },
): void {
  const titleSize = clamp(box.height * 0.2, 9, 24)
  const subtitleSize = clamp(box.height * 0.105, 7, 13)
  const labelSize = clamp(box.height * 0.09, 6, 11)
  const contentWidth = Math.max(1, box.width - paddingX * 2)

  context.save()
  context.transform(box.xAxis.x, box.xAxis.y, box.yAxis.x, box.yAxis.y, box.origin.x, box.origin.y)

  context.fillStyle = tone.coverAccent
  context.fillRect(paddingX, paddingY, Math.max(12, box.width * 0.24), Math.max(2, box.height * 0.025))

  context.fillStyle = tone.coverText
  context.font = `800 ${titleSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  context.textBaseline = 'top'
  drawWrappedText(context, title, paddingX, paddingY + box.height * 0.13, contentWidth, titleSize * 1.12, 2)

  if (subtitle) {
    context.fillStyle = tone.coverMuted
    context.font = `600 ${subtitleSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    drawWrappedText(context, subtitle, paddingX, paddingY + box.height * 0.58, contentWidth, subtitleSize * 1.3, 1)
  }

  context.fillStyle = 'rgba(7, 10, 13, 0.42)'
  context.fillRect(paddingX, box.height - paddingY - labelSize * 1.8, labelSize * 4.2, labelSize * 1.8)
  context.fillStyle = tone.coverText
  context.font = `750 ${labelSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  context.fillText(label, paddingX + labelSize * 0.72, box.height - paddingY - labelSize * 1.45)

  context.restore()
}

/**
 * 绘制一个已有内容的格子封面。
 */
export function drawOccupiedCell(
  context: CanvasRenderingContext2D,
  grid: PerspectiveGrid,
  cell: Cell,
  introProgress: number,
): void {
  const rect = grid.cellRect(cell)
  if (!grid.isDrawableCell(rect)) return

  const tone = toneMap[cell.tone]
  const animatedPoints = getIntroPoints(rect.points, introProgress)
  const textBox = getProjectedTextBox(animatedPoints)
  const inset = Math.max(1, 1.4 * grid.zoom)
  const paddingX = clamp(textBox.width * 0.11, 5, 24)
  const paddingY = clamp(textBox.height * 0.16, 4, 22)
  const preview = getCellPreview(cell)
  const alpha = clamp(introProgress, 0, 1)

  context.save()
  context.globalAlpha = alpha
  context.shadowColor = tone.glow
  context.shadowBlur = (28 + (1 - introProgress) * 34) * grid.zoom
  context.fillStyle = createCoverGradient(context, textBox, tone)
  context.strokeStyle = tone.stroke
  context.lineWidth = 1
  drawCellPath(context, animatedPoints, inset)
  context.fill()
  context.stroke()
  context.restore()

  context.save()
  context.globalAlpha = alpha
  drawProjectedCover(context, preview.title, preview.subtitle, preview.label, textBox, paddingX, paddingY, tone)
  context.restore()
}

/**
 * 绘制 hover 或 active 状态下的焦点格子。
 */
export function drawFocusedCell(
  context: CanvasRenderingContext2D,
  grid: PerspectiveGrid,
  coord: Coord,
  state: 'hover' | 'active',
): void {
  const rect = grid.cellRect(coord)
  const glow = state === 'active' ? 28 : 18

  context.save()
  context.shadowColor = 'rgba(125, 255, 191, 0.55)'
  context.shadowBlur = glow
  context.strokeStyle = state === 'active' ? '#8dffc7' : 'rgba(172, 255, 208, 0.8)'
  context.fillStyle = state === 'active' ? 'rgba(125, 255, 191, 0.08)' : 'rgba(125, 255, 191, 0.04)'
  context.lineWidth = state === 'active' ? 2 : 1
  drawCellPath(context, rect.points, 1)
  context.fill()
  context.stroke()
  context.restore()
}

/**
 * 根据入场动画进度把格子四个角点从中心向外展开。
 */
function getIntroPoints(points: { x: number; y: number }[], progress: number): { x: number; y: number }[] {
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const scale = 0.86 + progress * 0.14

  return points.map((point) => ({
    x: centerX + (point.x - centerX) * scale,
    y: centerY + (point.y - centerY) * scale,
  }))
}
