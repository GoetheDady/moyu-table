import { CELL_SIZE } from '../../domain/cells/constants'
import type { PerspectiveGrid } from '../../domain/cells/geometry'

/** 表示背景装饰中的一个发光点。 */
export type SparkleDef = {
  worldX: number
  worldY: number
  color: string
  baseOpacity: number
  phase: number
  speed: number
}

/** 表示一帧中一个发光点的动画状态。 */
type AnimatedSparkle = {
  screenX: number
  screenY: number
  color: string
  opacity: number
  shadowBlur: number
}

/** 世界空间的连续坐标边界，用于确定需要生成点点的区域。 */
export type WorldBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** 每个世界空间 cell 的尺寸——点点的固定间距，与相机位置无关。每 3 个网格 cell。 */
const SPARKLE_CELL_SIZE = 3 * CELL_SIZE

const SPARKLE_COLORS = [
  'rgba(112, 245, 177, 0.72)',
  'rgba(255, 184, 76, 0.76)',
  'rgba(107, 218, 255, 0.66)',
  'rgba(119, 246, 186, 0.74)',
  'rgba(255, 121, 92, 0.7)',
  'rgba(92, 219, 255, 0.72)',
]

const DRIFT_AMPLITUDE = 4
const BREATH_AMPLITUDE = 0.3
const MIN_OPACITY = 0.15
const MAX_OPACITY = 0.9
const BASE_SHADOW_BLUR = 8
const SHADOW_BLUR_AMPLITUDE = 6

/**
 * 对整数坐标对生成 [0, 1) 范围内的确定性哈希值。
 *
 * 相同的 (x, y) 始终返回相同的哈希，用于确保回到同一区域
 * 时点点的位置、颜色和动画节奏一致。
 *
 * @param x 整数 x 坐标。
 * @param y 整数 y 坐标。
 * @returns [0, 1) 之间的确定性浮点数。
 */
export function hashCoord(x: number, y: number): number {
  let h = ((x * 374761393 + y * 668265263) | 0) >>> 0

  h ^= h >>> 13
  h = Math.imul(h, 1274126177)
  h ^= h >>> 16

  return (h >>> 0) / 4294967296
}

/**
 * 根据可见世界区域按固定间距生成发光点定义。
 *
 * 点点按 SPARKLE_CELL_SIZE 间距铺满连续世界空间。世界空间 cell 索引
 * 固定不变（与相机位置无关），因此平移/缩放时同一点点保持在同一世界位置，
 * 通过 perspective 投影自然移动——不会再出现网格对齐导致的跳跃。
 *
 * @param bounds 当前可见的世界空间连续坐标边界。
 * @returns 可见范围内的发光点定义数组。
 */
export function generateSparkles(bounds: WorldBounds): SparkleDef[] {
  const sparkles: SparkleDef[] = []

  const startCellX = Math.floor(bounds.minX / SPARKLE_CELL_SIZE) - 1
  const endCellX = Math.ceil(bounds.maxX / SPARKLE_CELL_SIZE) + 1
  const startCellY = Math.floor(bounds.minY / SPARKLE_CELL_SIZE) - 1
  const endCellY = Math.ceil(bounds.maxY / SPARKLE_CELL_SIZE) + 1

  for (let cx = startCellX; cx <= endCellX; cx++) {
    for (let cy = startCellY; cy <= endCellY; cy++) {
      const h = hashCoord(cx, cy)
      const offsetX = (hashCoord(cx + 0.31, cy + 0.17) - 0.5) * SPARKLE_CELL_SIZE * 0.8
      const offsetY = (hashCoord(cx + 0.73, cy + 0.59) - 0.5) * SPARKLE_CELL_SIZE * 0.8

      sparkles.push({
        worldX: cx * SPARKLE_CELL_SIZE + SPARKLE_CELL_SIZE / 2 + offsetX,
        worldY: cy * SPARKLE_CELL_SIZE + SPARKLE_CELL_SIZE / 2 + offsetY,
        color: SPARKLE_COLORS[Math.floor(h * SPARKLE_COLORS.length)],
        baseOpacity: 0.25 + h * 0.3,
        phase: h * Math.PI * 2,
        speed: 0.5 + hashCoord(cx + 0.55, cy + 0.83) * 1.0,
      })
    }
  }

  return sparkles
}

/**
 * 计算一个发光点在当前时间的屏幕动画状态。
 *
 * 包含基于正弦波的屏幕位置微漂和透明度呼吸。
 *
 * @param sparkle 发光点定义。
 * @param now 当前帧时间戳（毫秒）。
 * @param screenBase 发光点在世界坐标投影后的基础屏幕位置。
 * @returns 带漂移和呼吸后的屏幕动画状态。
 */
export function computeSparkleAnimation(
  sparkle: SparkleDef,
  now: number,
  screenBase: { x: number; y: number },
): AnimatedSparkle {
  const time = now * 0.001
  const dx = Math.sin(time * sparkle.speed + sparkle.phase) * DRIFT_AMPLITUDE
  const dy = Math.cos(time * sparkle.speed * 0.7 + sparkle.phase * 1.3) * DRIFT_AMPLITUDE
  const breathe = Math.sin(time * 0.8 * sparkle.speed + sparkle.phase) * BREATH_AMPLITUDE
  const opacity = sparkle.baseOpacity + breathe

  return {
    screenX: screenBase.x + dx,
    screenY: screenBase.y + dy,
    color: sparkle.color,
    opacity: clampToRange(opacity, MIN_OPACITY, MAX_OPACITY),
    shadowBlur: BASE_SHADOW_BLUR + breathe * SHADOW_BLUR_AMPLITUDE,
  }
}

/**
 * 将数值限制在指定范围内。
 */
function clampToRange(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

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
 * 绘制背景中的发光点装饰——动态生成、带呼吸和浮动动画。
 *
 * 点点在世界空间中以固定间距铺开（与相机及网格对齐无关），通过屏幕四角
 * 反向投影确定需要绘制的区域，平移/缩放时点点平滑跟随自然移动。
 *
 * @param context Canvas 2D 渲染上下文。
 * @param grid 当前透视网格工具对象。
 * @param now 当前帧时间戳（毫秒），用于驱动动画。
 */
export function drawSparkles(context: CanvasRenderingContext2D, grid: PerspectiveGrid, now: number): void {
  const bounds = getVisibleWorldBounds(grid)
  const sparkles = generateSparkles(bounds)

  context.save()

  for (const sparkle of sparkles) {
    const screenBase = grid.worldToScreen({ x: sparkle.worldX, y: sparkle.worldY })

    if (
      screenBase.x < -30 ||
      screenBase.x > grid.viewport.width + 30 ||
      screenBase.y < -30 ||
      screenBase.y > grid.viewport.height + 30
    ) {
      continue
    }

    const animated = computeSparkleAnimation(sparkle, now, screenBase)

    context.beginPath()
    context.shadowColor = animated.color
    context.shadowBlur = animated.shadowBlur
    context.fillStyle = animated.color
    context.globalAlpha = animated.opacity
    context.arc(animated.screenX, animated.screenY, 1.35, 0, Math.PI * 2)
    context.fill()
  }

  context.restore()
}

/**
 * 从屏幕四角反向投影计算可见世界区域的连续坐标边界。
 *
 * 使用略微扩展的 padding 以确保边缘点点在视口外也有生成。
 *
 * @param grid 当前透视网格工具对象。
 * @returns 可见世界区域的连续坐标边界。
 */
function getVisibleWorldBounds(grid: PerspectiveGrid): WorldBounds {
  const padding = 32
  const corners = [
    grid.screenToWorld({ x: -padding, y: -padding }),
    grid.screenToWorld({ x: grid.viewport.width + padding, y: -padding }),
    grid.screenToWorld({ x: -padding, y: grid.viewport.height + padding }),
    grid.screenToWorld({ x: grid.viewport.width + padding, y: grid.viewport.height + padding }),
  ]

  return {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxY: Math.max(...corners.map((c) => c.y)),
  }
}
