import { getCellPreview } from '../../domain/cells/cellPresentation'
import { CELL_SIZE } from '../../domain/cells/constants'
import { toneMap, type CellToneStyle } from '../../domain/cells/cellStyle'
import { clamp, drawCellPath, type PerspectiveGrid } from '../../domain/cells/geometry'
import { drawWrappedText, getProjectedTextBox, type ProjectedTextBox } from '../../domain/cells/text'
import type { Cell, Coord, Selection } from '../../domain/cells/types'

const CELL_INTRO_ANIMATION_MS = 520

const wallSparkles = [
  { x: -680, y: -360, color: 'rgba(112, 245, 177, 0.72)' },
  { x: -320, y: -245, color: 'rgba(255, 184, 76, 0.76)' },
  { x: 42, y: -310, color: 'rgba(107, 218, 255, 0.66)' },
  { x: 420, y: -210, color: 'rgba(119, 246, 186, 0.74)' },
  { x: 770, y: -330, color: 'rgba(255, 121, 92, 0.7)' },
  { x: -520, y: 210, color: 'rgba(92, 219, 255, 0.72)' },
  { x: -80, y: 310, color: 'rgba(113, 246, 180, 0.78)' },
  { x: 330, y: 205, color: 'rgba(255, 119, 94, 0.72)' },
  { x: 610, y: 360, color: 'rgba(88, 220, 255, 0.66)' },
  { x: -760, y: 470, color: 'rgba(112, 245, 177, 0.72)' },
  { x: -300, y: 520, color: 'rgba(92, 219, 255, 0.7)' },
  { x: 260, y: 480, color: 'rgba(255, 184, 76, 0.76)' },
]

/** 表示墙面场景中格子入场动画需要跨帧保留的状态。 */
export type WallSceneAnimationStore = {
  cellIntroStartedAt: Map<string, number>
  previousCellIds: Set<string>
}

/** 表示绘制一帧墙面场景所需的全部输入。 */
export type WallSceneFrame = {
  context: CanvasRenderingContext2D
  cells: Cell[]
  grid: PerspectiveGrid
  hoveredCoord: Coord | null
  selection: Selection | null
  animationStore: WallSceneAnimationStore
  now: number
}

/**
 * 创建墙面场景动画状态容器。
 *
 * @returns 空的动画状态容器，用于记录新出现格子的入场动画起点。
 */
export function createWallSceneAnimationStore(): WallSceneAnimationStore {
  return {
    cellIntroStartedAt: new Map<string, number>(),
    previousCellIds: new Set<string>(),
  }
}

/**
 * 根据最新格子列表同步入场动画状态。
 *
 * @param store 墙面场景动画状态容器。
 * @param cells 当前可见格子列表。
 * @param now 当前时间戳。
 * @returns 无返回值，副作用是记录新格子的入场动画起点并清理已消失格子的动画状态。
 */
export function syncWallSceneAnimationStore(store: WallSceneAnimationStore, cells: Cell[], now: number): void {
  const nextCellIds = new Set(cells.map((cell) => cell.id))

  for (const cell of cells) {
    if (!store.previousCellIds.has(cell.id)) {
      store.cellIntroStartedAt.set(cell.id, now)
    }
  }

  for (const cellId of store.cellIntroStartedAt.keys()) {
    if (!nextCellIds.has(cellId)) {
      store.cellIntroStartedAt.delete(cellId)
    }
  }

  store.previousCellIds = nextCellIds
}

/**
 * 按当前网格视口和设备像素比调整 Canvas 尺寸。
 *
 * @param canvas 需要绘制墙面场景的 Canvas 元素。
 * @param context Canvas 2D 绘图上下文。
 * @param grid 当前透视网格工具对象。
 * @param devicePixelRatio 当前设备像素比。
 * @returns 无返回值，副作用是修改 Canvas 像素尺寸、CSS 尺寸和绘图变换矩阵。
 */
export function resizeCanvasForWallScene(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  grid: PerspectiveGrid,
  devicePixelRatio: number,
): void {
  canvas.width = Math.round(grid.viewport.width * devicePixelRatio)
  canvas.height = Math.round(grid.viewport.height * devicePixelRatio)
  canvas.style.width = `${grid.viewport.width}px`
  canvas.style.height = `${grid.viewport.height}px`

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
}

/**
 * 绘制一帧完整的无限格子墙场景。
 *
 * @param frame 当前帧所需的 Canvas、格子、网格、交互和动画状态。
 * @returns 如果仍有格子入场动画需要继续绘制下一帧，返回 true。
 *
 * 副作用：会清空并重绘 Canvas；格子入场动画完成时会从 animationStore 中清理状态。
 */
export function drawWallScene(frame: WallSceneFrame): boolean {
  const { context, cells, grid, hoveredCoord, selection, animationStore, now } = frame

  context.clearRect(0, 0, grid.viewport.width, grid.viewport.height)
  drawBackground(context, grid)
  drawGrid(context, grid)
  drawSparkles(context, grid)

  let hasActiveIntroAnimation = false

  for (const cell of cells) {
    const introProgress = getCellIntroProgress(animationStore, cell.id, now)
    if (introProgress < 1) {
      hasActiveIntroAnimation = true
    }

    drawOccupiedCell(context, grid, cell, introProgress)
  }

  if (hoveredCoord && !cells.some((cell) => cell.x === hoveredCoord.x && cell.y === hoveredCoord.y)) {
    drawFocusedCell(context, grid, hoveredCoord, 'hover')
  }

  if (selection?.mode === 'edit') {
    drawFocusedCell(context, grid, selection.coord, 'active')
  }

  return hasActiveIntroAnimation
}

/**
 * 绘制深色背景和暗角。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param grid 当前透视网格工具对象。
 * @returns 无返回值，副作用是在 Canvas 上填充背景。
 */
function drawBackground(context: CanvasRenderingContext2D, grid: PerspectiveGrid): void {
  const gradient = context.createLinearGradient(0, 0, 0, grid.viewport.height)
  gradient.addColorStop(0, '#070a0d')
  gradient.addColorStop(0.55, '#0b0f12')
  gradient.addColorStop(1, '#06080b')
  context.fillStyle = gradient
  context.fillRect(0, 0, grid.viewport.width, grid.viewport.height)

  const vignette = context.createRadialGradient(
    grid.viewport.width / 2,
    grid.viewport.height / 2,
    Math.min(grid.viewport.width, grid.viewport.height) * 0.12,
    grid.viewport.width / 2,
    grid.viewport.height / 2,
    Math.max(grid.viewport.width, grid.viewport.height) * 0.72,
  )
  vignette.addColorStop(0, 'rgba(84, 115, 105, 0.06)')
  vignette.addColorStop(0.55, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)')
  context.fillStyle = vignette
  context.fillRect(0, 0, grid.viewport.width, grid.viewport.height)
}

/**
 * 绘制当前可见范围内的透视网格线。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param grid 当前透视网格工具对象。
 * @returns 无返回值，副作用是在 Canvas 上绘制横纵网格线。
 */
function drawGrid(context: CanvasRenderingContext2D, grid: PerspectiveGrid): void {
  const { startX, endX, startY, endY } = grid.visibleWorldGridRange()

  context.lineWidth = 1

  for (let x = startX; x <= endX; x += 1) {
    const start = grid.worldToScreen({ x: x * CELL_SIZE, y: startY * CELL_SIZE })
    const end = grid.worldToScreen({ x: x * CELL_SIZE, y: endY * CELL_SIZE })
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.strokeStyle = x % 5 === 0 ? 'rgba(88, 100, 112, 0.22)' : 'rgba(61, 72, 82, 0.14)'
    context.stroke()
  }

  for (let y = startY; y <= endY; y += 1) {
    const start = grid.worldToScreen({ x: startX * CELL_SIZE, y: y * CELL_SIZE })
    const end = grid.worldToScreen({ x: endX * CELL_SIZE, y: y * CELL_SIZE })
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.strokeStyle = y % 5 === 0 ? 'rgba(88, 100, 112, 0.22)' : 'rgba(61, 72, 82, 0.14)'
    context.stroke()
  }
}

/**
 * 绘制背景中的发光点装饰。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param grid 当前透视网格工具对象。
 * @returns 无返回值，副作用是在 Canvas 上绘制可见范围内的装饰点。
 */
function drawSparkles(context: CanvasRenderingContext2D, grid: PerspectiveGrid): void {
  context.save()

  for (const dot of wallSparkles) {
    const screen = grid.worldToScreen(dot)

    if (
      screen.x < -20 ||
      screen.x > grid.viewport.width + 20 ||
      screen.y < -20 ||
      screen.y > grid.viewport.height + 20
    ) {
      continue
    }

    context.beginPath()
    context.shadowColor = dot.color
    context.shadowBlur = 12
    context.fillStyle = dot.color
    context.arc(screen.x, screen.y, 1.35, 0, Math.PI * 2)
    context.fill()
  }

  context.restore()
}

/**
 * 绘制一个已有内容的格子封面。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param grid 当前透视网格工具对象。
 * @param cell 需要绘制的格子数据。
 * @param introProgress 格子入场动画进度，范围为 0 到 1。
 * @returns 无返回值，副作用是在 Canvas 上绘制封面卡片、标题和类型标签。
 */
function drawOccupiedCell(
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
 *
 * @param context Canvas 2D 绘图上下文。
 * @param grid 当前透视网格工具对象。
 * @param coord 焦点格子坐标。
 * @param state 焦点状态，hover 表示悬停，active 表示正在编辑。
 * @returns 无返回值，副作用是在 Canvas 上绘制高亮边框。
 */
function drawFocusedCell(
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
 * 获取指定格子的入场动画进度。
 *
 * @param store 墙面场景动画状态容器。
 * @param cellId 格子 id。
 * @param now 当前帧时间戳。
 * @returns 缓动后的动画进度，范围为 0 到 1。
 */
function getCellIntroProgress(store: WallSceneAnimationStore, cellId: string, now: number): number {
  const startedAt = store.cellIntroStartedAt.get(cellId)
  if (startedAt === undefined) return 1

  const progress = clamp((now - startedAt) / CELL_INTRO_ANIMATION_MS, 0, 1)

  if (progress >= 1) {
    store.cellIntroStartedAt.delete(cellId)
  }

  return easeOutCubic(progress)
}

/**
 * 为投影后的封面卡片创建线性渐变。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param box 投影文字盒子，用来确定渐变范围。
 * @param tone 当前格子色调样式。
 * @returns 可作为 fillStyle 使用的 Canvas 渐变对象。
 */
function createCoverGradient(
  context: CanvasRenderingContext2D,
  box: ProjectedTextBox,
  tone: CellToneStyle,
): CanvasGradient {
  const gradient = context.createLinearGradient(box.origin.x, box.origin.y, box.origin.x, box.origin.y + box.height)
  gradient.addColorStop(0, tone.coverTop)
  gradient.addColorStop(1, tone.coverBottom)

  return gradient
}

/**
 * 在投影格子中绘制封面内容。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param title 封面主标题。
 * @param subtitle 封面副标题，可为空。
 * @param label 内容类型标签。
 * @param box 投影文字盒子，定义局部绘制坐标系。
 * @param paddingX 水平方向内边距。
 * @param paddingY 垂直方向内边距。
 * @param tone 当前格子色调样式。
 * @returns 无返回值，副作用是在 Canvas 上绘制标题、副标题、标签和装饰线。
 */
function drawProjectedCover(
  context: CanvasRenderingContext2D,
  title: string,
  subtitle: string | undefined,
  label: string,
  box: ProjectedTextBox,
  paddingX: number,
  paddingY: number,
  tone: CellToneStyle,
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
 * 根据入场动画进度把格子四个角点从中心向外展开。
 *
 * @param points 格子投影后的四个角点。
 * @param progress 入场动画进度，范围为 0 到 1。
 * @returns 缩放后的四个角点。
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

/**
 * 计算缓出的三次方动画进度。
 *
 * @param progress 原始线性进度，范围为 0 到 1。
 * @returns 缓动后的进度，开头快、结尾慢。
 */
function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3
}
