import { useEffect, useRef } from 'react'
import { sparkles } from '../data/demoCells.js'
import { CELL_SIZE } from '../lib/constants.js'
import { toneMap } from '../lib/cellStyle.js'
import { clamp, drawCellPath } from '../lib/geometry.js'
import type { PerspectiveGrid } from '../lib/geometry.js'
import { drawProjectedWrappedText, getProjectedTextBox, truncateForCell } from '../lib/text.js'
import {
  beginWallPointer,
  hoverWallAtPoint,
  moveWallPointer,
  releaseWallPointer,
  zoomWallAtPoint,
  type WallPointerSession,
} from '../lib/wallInteraction.js'
import type { Camera, Cell, Coord, Selection } from '../lib/types.js'

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
  const dragRef = useRef<WallPointerSession>({
    pointerId: -1,
    lastPoint: { x: 0, y: 0 },
    anchorWorld: { x: 0, y: 0 },
    totalDistance: 0,
    isDragging: false,
  })

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
     * 绘制一个已有内容的单元格。
     *
     * @param cell 需要绘制的单元格数据。
     * @returns 无返回值，副作用是在 Canvas 上绘制单元格底色、描边和文字。
     */
    const drawOccupiedCell = (cell: Cell) => {
      const rect = grid.cellRect(cell)
      if (!grid.isDrawableCell(rect)) return

      const tone = toneMap[cell.tone]
      const textBox = getProjectedTextBox(rect.points)
      const inset = Math.max(1, 1.4 * grid.zoom)
      const fontSize = clamp(textBox.height * 0.22, 8, 28)
      const lineHeight = fontSize * 1.42
      const paddingX = clamp(textBox.width * 0.11, 5, 24)
      const paddingY = clamp(textBox.height * 0.16, 4, 22)

      context.save()
      context.shadowColor = tone.glow
      context.shadowBlur = 22 * grid.zoom
      context.fillStyle = tone.fill
      context.strokeStyle = tone.stroke
      context.lineWidth = 1
      drawCellPath(context, rect.points, inset)
      context.fill()
      context.stroke()
      context.restore()

      context.save()
      context.fillStyle = tone.text
      context.font = `650 ${fontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
      context.textBaseline = 'top'
      drawProjectedWrappedText(
        context,
        truncateForCell(cell.content),
        textBox,
        paddingX,
        paddingY,
        lineHeight,
        3,
      )
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

    context.clearRect(0, 0, grid.viewport.width, grid.viewport.height)
    drawBackground()
    drawGrid()
    drawSparkles()

    for (const cell of cells) {
      drawOccupiedCell(cell)
    }

    if (hoveredCoord && !cells.some((cell) => cell.x === hoveredCoord.x && cell.y === hoveredCoord.y)) {
      drawFocusedCell(hoveredCoord, 'hover')
    }

    if (selection?.mode === 'edit') {
      drawFocusedCell(selection.coord, 'active')
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
