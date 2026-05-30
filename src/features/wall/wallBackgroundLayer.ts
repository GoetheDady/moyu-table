import { CELL_SIZE } from '../../domain/cells/constants'
import type { PerspectiveGrid } from '../../domain/cells/geometry'

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

/**
 * 绘制深色背景和暗角。
 */
export function drawBackground(context: CanvasRenderingContext2D, grid: PerspectiveGrid): void {
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
 */
export function drawGrid(context: CanvasRenderingContext2D, grid: PerspectiveGrid): void {
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
 */
export function drawSparkles(context: CanvasRenderingContext2D, grid: PerspectiveGrid): void {
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
