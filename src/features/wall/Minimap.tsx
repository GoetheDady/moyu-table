import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CellClient } from '../../data/cellClient'
import { CELL_SIZE } from '../../domain/cells/constants'
import type { PerspectiveGrid } from '../../domain/cells/geometry'
import { getMinimapProjection } from '../../domain/cells/minimapProjection'
import type { Cell } from '../../domain/cells/types'
import { useMinimapCells } from './useMinimapCells'

const MINIMAP_WIDTH = 240
const MINIMAP_HEIGHT = 160
const DOT_RADIUS = 2.5

type MinimapProps = {
  grid: PerspectiveGrid
  cellClient: CellClient
  onJumpTo: (worldX: number, worldY: number) => void
}

/**
 * 右下角小地图组件——展示附近有内容的格子分布和当前视口位置。
 *
 * 点击小地图上的任意位置会触发主画布动画跳转到对应世界坐标。
 *
 * @param props 当前透视网格、格子客户端和跳转回调。
 * @returns Canvas 元素。
 */
export function Minimap({ grid, cellClient, onJumpTo }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const minimapCells = useMinimapCells(grid.camera, grid.zoom, grid.viewport, cellClient)

  const projection = useMemo(
    () => getMinimapProjection(grid.camera, grid.zoom, grid.viewport, MINIMAP_WIDTH, MINIMAP_HEIGHT),
    [grid.camera, grid.zoom, grid.viewport],
  )

  /**
   * 每帧重绘小地图。
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(MINIMAP_WIDTH * dpr)
    canvas.height = Math.round(MINIMAP_HEIGHT * dpr)
    canvas.style.width = `${MINIMAP_WIDTH}px`
    canvas.style.height = `${MINIMAP_HEIGHT}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    drawMinimap(context, grid, minimapCells, projection)
  }, [grid, minimapCells, projection])

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const world = projection.minimapToWorld(px, py)

      onJumpTo(world.x, world.y)
    },
    [projection, onJumpTo],
  )

  const surface =
    'border border-moyu-border-soft bg-moyu-panel-soft shadow-moyu-dock backdrop-blur-2xl'

  return (
    <div
      aria-label="小地图"
      className={`absolute bottom-[18px] right-[18px] z-30 rounded-lg overflow-hidden ${surface}`}
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
    >
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        onClick={handleClick}
      />
    </div>
  )
}

/**
 * 绘制小地图一帧：背景 + 网格 + 格子点 + 视口框。
 */
function drawMinimap(
  context: CanvasRenderingContext2D,
  grid: PerspectiveGrid,
  cells: Cell[],
  projection: ReturnType<typeof getMinimapProjection>,
): void {
  context.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT)

  drawMinimapBackground(context)
  drawMinimapGrid(context, projection)
  drawMinimapCellsDots(context, projection, cells)
  drawMinimapViewport(context, grid, projection)
}

/**
 * 绘制小地图暗色背景。
 */
function drawMinimapBackground(context: CanvasRenderingContext2D): void {
  context.fillStyle = 'rgba(5, 8, 10, 0.85)'
  context.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT)
}

/**
 * 绘制稀疏的参考网格线（每 5 个 cell 一条）。
 */
function drawMinimapGrid(
  context: CanvasRenderingContext2D,
  projection: ReturnType<typeof getMinimapProjection>,
): void {
  // 计算小地图四角对应的世界坐标，确定需要绘制网格线的范围
  const topLeft = projection.minimapToWorld(0, 0)
  const bottomRight = projection.minimapToWorld(MINIMAP_WIDTH, MINIMAP_HEIGHT)

  const minWorldX = Math.min(topLeft.x, bottomRight.x)
  const maxWorldX = Math.max(topLeft.x, bottomRight.x)
  const minWorldY = Math.min(topLeft.y, bottomRight.y)
  const maxWorldY = Math.max(topLeft.y, bottomRight.y)

  const startCellX = Math.floor(minWorldX / CELL_SIZE)
  const endCellX = Math.ceil(maxWorldX / CELL_SIZE)
  const startCellY = Math.floor(minWorldY / CELL_SIZE)
  const endCellY = Math.ceil(maxWorldY / CELL_SIZE)

  const step = 5
  context.lineWidth = 0.5

  for (let cx = startCellX; cx <= endCellX; cx++) {
    if (cx % step !== 0) continue
    const worldX = cx * CELL_SIZE
    const a = projection.worldToMinimap(worldX, minWorldY)
    const b = projection.worldToMinimap(worldX, maxWorldY)

    context.beginPath()
    context.moveTo(a.x, a.y)
    context.lineTo(b.x, b.y)
    context.strokeStyle = 'rgba(60, 72, 84, 0.25)'
    context.stroke()
  }

  for (let cy = startCellY; cy <= endCellY; cy++) {
    if (cy % step !== 0) continue
    const worldY = cy * CELL_SIZE
    const a = projection.worldToMinimap(minWorldX, worldY)
    const b = projection.worldToMinimap(maxWorldX, worldY)

    context.beginPath()
    context.moveTo(a.x, a.y)
    context.lineTo(b.x, b.y)
    context.strokeStyle = 'rgba(60, 72, 84, 0.25)'
    context.stroke()
  }
}

/**
 * 绘制已占用格子的发光圆点。
 */
function drawMinimapCellsDots(
  context: CanvasRenderingContext2D,
  projection: ReturnType<typeof getMinimapProjection>,
  cells: Cell[],
): void {
  const cellSize = CELL_SIZE

  for (const cell of cells) {
    // cell 坐标 y 向上为正，世界坐标 y 向下为正
    const worldX = cell.x * cellSize + cellSize / 2
    const worldY = -cell.y * cellSize + cellSize / 2

    const screen = projection.worldToMinimap(worldX, worldY)

    // 裁剪：超出小地图边界的点点不绘制
    if (screen.x < -5 || screen.x > MINIMAP_WIDTH + 5 || screen.y < -5 || screen.y > MINIMAP_HEIGHT + 5) {
      continue
    }

    context.beginPath()
    context.fillStyle = 'rgba(153, 255, 200, 0.82)'
    context.shadowColor = 'rgba(153, 255, 200, 0.55)'
    context.shadowBlur = 3
    context.arc(screen.x, screen.y, DOT_RADIUS, 0, Math.PI * 2)
    context.fill()
  }
}

/**
 * 绘制当前主视口区域（白色半透明矩形）。
 *
 * 通过将主画布屏幕四角投影到世界坐标，再映射到小地图坐标来绘制。
 */
function drawMinimapViewport(
  context: CanvasRenderingContext2D,
  grid: PerspectiveGrid,
  projection: ReturnType<typeof getMinimapProjection>,
): void {
  const corners = [
    grid.screenToWorld({ x: 0, y: 0 }),
    grid.screenToWorld({ x: grid.viewport.width, y: 0 }),
    grid.screenToWorld({ x: grid.viewport.width, y: grid.viewport.height }),
    grid.screenToWorld({ x: 0, y: grid.viewport.height }),
  ]

  const minimapCorners = corners.map((c) => projection.worldToMinimap(c.x, c.y))

  context.beginPath()
  context.moveTo(minimapCorners[0].x, minimapCorners[0].y)
  for (let i = 1; i < minimapCorners.length; i++) {
    context.lineTo(minimapCorners[i].x, minimapCorners[i].y)
  }
  context.closePath()

  context.fillStyle = 'rgba(255, 255, 255, 0.08)'
  context.fill()
  context.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  context.lineWidth = 1
  context.stroke()
}
