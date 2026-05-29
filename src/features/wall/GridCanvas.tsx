import { useEffect, useRef } from 'react'
import { sparkles } from '../../data/demoCells'
import { getCellPreview } from '../../domain/cells/cellPreview'
import { CELL_SIZE } from '../../domain/cells/constants'
import { toneMap } from '../../domain/cells/cellStyle'
import type { CellToneStyle } from '../../domain/cells/cellStyle'
import { clamp, drawCellPath } from '../../domain/cells/geometry'
import type { PerspectiveGrid } from '../../domain/cells/geometry'
import { drawWrappedText, getProjectedTextBox } from '../../domain/cells/text'
import {
  beginWallPointer,
  hoverWallAtPoint,
  moveWallPointer,
  releaseWallPointer,
  zoomWallAtPoint,
  type WallPointerSession,
} from './wallInteraction'
import type { Camera, Cell, Coord, Selection } from '../../domain/cells/types'

const CELL_INTRO_ANIMATION_MS = 520

/** GridCanvas 组件需要的外部状态和回调。 */
type GridCanvasProps = {
  cells: Cell[]
  grid: PerspectiveGrid
  hoveredCoord: Coord | null
  selection: Selection | null
  onCancelJumpAnimation: () => void
  onCameraChange: (camera: Camera) => void
  onDraftChange: (draft: string) => void
  onHoveredCoordChange: (coord: Coord | null) => void
  onSelectionChange: (selection: Selection | null) => void
  onZoomChange: (zoom: number) => void
}

/**
 * 渲染可拖拽、可缩放、可选择单元格的透视网格画布。
 *
 * @param props 画布需要的单元格、视图状态和交互回调。
 * @returns Canvas 元素。
 */
export function GridCanvas({
  cells,
  grid,
  hoveredCoord,
  selection,
  onCancelJumpAnimation,
  onCameraChange,
  onDraftChange,
  onHoveredCoordChange,
  onSelectionChange,
  onZoomChange,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cellIntroStartedAtRef = useRef(new Map<string, number>())
  const previousCellIdsRef = useRef(new Set<string>())
  const dragRef = useRef<WallPointerSession>({
    pointerId: -1,
    lastPoint: { x: 0, y: 0 },
    anchorWorld: { x: 0, y: 0 },
    totalDistance: 0,
    isDragging: false,
  })

  useEffect(() => {
    const now = performance.now()
    const nextCellIds = new Set(cells.map((cell) => cell.id))

    for (const cell of cells) {
      if (!previousCellIdsRef.current.has(cell.id)) {
        cellIntroStartedAtRef.current.set(cell.id, now)
      }
    }

    for (const cellId of cellIntroStartedAtRef.current.keys()) {
      if (!nextCellIds.has(cellId)) {
        cellIntroStartedAtRef.current.delete(cellId)
      }
    }

    previousCellIdsRef.current = nextCellIds
  }, [cells])

  /**
   * 绘制画布背景、网格、装饰点、已有单元格和当前焦点单元格。
   *
   * @returns 无返回值，副作用是重设 Canvas 尺寸并绘制当前帧。
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(grid.viewport.width * dpr)
    canvas.height = Math.round(grid.viewport.height * dpr)
    canvas.style.width = `${grid.viewport.width}px`
    canvas.style.height = `${grid.viewport.height}px`

    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    /**
     * 绘制深色背景和暗角。
     *
     * @returns 无返回值，副作用是在 Canvas 上填充背景。
     */
    const drawBackground = () => {
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
     * @returns 无返回值，副作用是在 Canvas 上绘制横纵网格线。
     */
    const drawGrid = () => {
      const { startX, endX, startY, endY } = grid.visibleRange()

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
     * @returns 无返回值，副作用是在 Canvas 上绘制可见范围内的装饰点。
     */
    const drawSparkles = () => {
      context.save()

      for (const dot of sparkles) {
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
     * 绘制一个已有内容的单元格封面。
     *
     * @param cell 需要绘制的单元格数据。
     * @param introProgress 单元格入场动画进度，范围为 0 到 1。
     * @returns 无返回值，副作用是在 Canvas 上绘制封面卡片、标题和类型标签。
     */
    const drawOccupiedCell = (cell: Cell, introProgress: number) => {
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
     * 绘制 hover 或 active 状态下的焦点单元格。
     *
     * @param coord 焦点单元格坐标。
     * @param state 焦点状态，hover 表示悬停，active 表示正在编辑。
     * @returns 无返回值，副作用是在 Canvas 上绘制高亮边框。
     */
    const drawFocusedCell = (coord: Coord, state: 'hover' | 'active') => {
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
     * 绘制当前帧，并在仍有入场动画时继续请求下一帧。
     *
     * @param now 当前帧时间戳。
     * @returns 无返回值，副作用是在 Canvas 上绘制当前画面。
     */
    const drawFrame = (now: number) => {
      context.clearRect(0, 0, grid.viewport.width, grid.viewport.height)
      drawBackground()
      drawGrid()
      drawSparkles()

      let hasActiveIntroAnimation = false

      for (const cell of cells) {
        const introProgress = getCellIntroProgress(cell.id, now)
        if (introProgress < 1) {
          hasActiveIntroAnimation = true
        }

        drawOccupiedCell(cell, introProgress)
      }

      if (hoveredCoord && !cells.some((cell) => cell.x === hoveredCoord.x && cell.y === hoveredCoord.y)) {
        drawFocusedCell(hoveredCoord, 'hover')
      }

      if (selection?.mode === 'edit') {
        drawFocusedCell(selection.coord, 'active')
      }

      if (hasActiveIntroAnimation) {
        animationFrameId = requestAnimationFrame(drawFrame)
      }
    }

    /**
     * 获取指定单元格的入场动画进度。
     *
     * @param cellId 单元格 id。
     * @param now 当前帧时间戳。
     * @returns 缓动后的动画进度，范围为 0 到 1。
     */
    const getCellIntroProgress = (cellId: string, now: number) => {
      const startedAt = cellIntroStartedAtRef.current.get(cellId)
      if (startedAt === undefined) return 1

      const progress = clamp((now - startedAt) / CELL_INTRO_ANIMATION_MS, 0, 1)

      if (progress >= 1) {
        cellIntroStartedAtRef.current.delete(cellId)
      }

      return easeOutCubic(progress)
    }

    let animationFrameId: number | null = null
    drawFrame(performance.now())

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [cells, grid, hoveredCoord, selection])

  /**
   * 绑定滚轮缩放事件，并以鼠标位置为锚点更新相机。
   *
   * @returns 清理函数，副作用是在 Canvas 元素上添加和移除 wheel 事件监听器。
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      onCancelJumpAnimation()

      const nextView = zoomWallAtPoint(event.deltaY, { x: event.clientX, y: event.clientY }, grid)

      onZoomChange(nextView.zoom)
      onCameraChange(nextView.camera)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [grid, onCameraChange, onCancelJumpAnimation, onZoomChange])

  /**
   * 处理指针按下，开始拖拽墙面或准备点击选中。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是捕获指针并初始化拖拽会话。
   */
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    onCancelJumpAnimation()

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = beginWallPointer(event.pointerId, { x: event.clientX, y: event.clientY }, grid)
    onHoveredCoordChange(null)
  }

  /**
   * 处理指针移动，更新 hover、拖拽相机和必要的选中态清理。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是更新相机、hover 坐标和选中状态。
   */
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = { x: event.clientX, y: event.clientY }
    const isActiveDrag = dragRef.current.isDragging && dragRef.current.pointerId === event.pointerId
    const coord = hoverWallAtPoint(point, grid, isActiveDrag)
    onHoveredCoordChange(coord)

    if (!isActiveDrag) return

    const move = moveWallPointer(dragRef.current, point, grid, Boolean(selection))
    dragRef.current = move.session

    onCameraChange(move.camera)

    if (move.shouldClearSelection) {
      onSelectionChange(null)
      onDraftChange('')
    }
  }

  /**
   * 处理指针释放，将交互判定为拖拽结束或单元格点击选择。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是可能切换选择态并清空草稿。
   */
  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return

    const release = releaseWallPointer(dragRef.current, { x: event.clientX, y: event.clientY }, grid, cells)
    dragRef.current = release.session

    if (release.didDrag) return

    onSelectionChange(release.selection)
    onDraftChange('')
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-screen w-screen cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => onHoveredCoordChange(null)}
      onPointerUp={handlePointerUp}
    />
  )
}

/**
 * 为投影后的封面卡片创建线性渐变。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param box 投影文字盒子，用来确定渐变范围。
 * @param tone 当前单元格色调样式。
 * @returns 可作为 fillStyle 使用的 Canvas 渐变对象。
 */
function createCoverGradient(
  context: CanvasRenderingContext2D,
  box: ReturnType<typeof getProjectedTextBox>,
  tone: CellToneStyle,
): CanvasGradient {
  const gradient = context.createLinearGradient(box.origin.x, box.origin.y, box.origin.x, box.origin.y + box.height)
  gradient.addColorStop(0, tone.coverTop)
  gradient.addColorStop(1, tone.coverBottom)

  return gradient
}

/**
 * 在投影单元格中绘制小红书式封面内容。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param title 封面主标题。
 * @param subtitle 封面副标题，可为空。
 * @param label 内容类型标签。
 * @param box 投影文字盒子，定义局部绘制坐标系。
 * @param paddingX 水平方向内边距。
 * @param paddingY 垂直方向内边距。
 * @param tone 当前单元格色调样式。
 * @returns 无返回值，副作用是在 Canvas 上绘制标题、副标题、标签和装饰线。
 */
function drawProjectedCover(
  context: CanvasRenderingContext2D,
  title: string,
  subtitle: string | undefined,
  label: string,
  box: ReturnType<typeof getProjectedTextBox>,
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
 * 根据入场动画进度把单元格四个角点从中心向外展开。
 *
 * @param points 单元格投影后的四个角点。
 * @param progress 入场动画进度，范围为 0 到 1。
 * @returns 缩放后的四个角点。
 */
function getIntroPoints(points: { x: number; y: number }[], progress: number) {
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
function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3
}
