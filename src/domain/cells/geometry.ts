import {
  CELL_SIZE,
  MAX_CELL_DRAW_HEIGHT,
  MAX_CELL_DRAW_WIDTH,
  PERSPECTIVE_STRENGTH,
  PERSPECTIVE_Y_SCALE,
} from './constants'
import type { Camera, CellRect, Coord } from './types'

/** 表示浏览器中可绘制区域的尺寸。 */
export type Viewport = {
  width: number
  height: number
}

/** 描述一次网格投影所需的相机、缩放和视口状态。 */
export type GridView = {
  camera: Camera
  zoom: number
  viewport: Viewport
}

/** 表示当前视口需要覆盖的网格坐标范围。 */
export type GridRange = {
  startX: number
  endX: number
  startY: number
  endY: number
}

/** 表示二维平面中的一个点。 */
type Point = {
  x: number
  y: number
}

/**
 * 生成稳定的坐标键，用于比较或查找同一个网格坐标。
 *
 * @param coord 需要转换的网格坐标。
 * @returns 形如 `x:y` 的字符串键。
 */
export const coordKey = (coord: Coord) => `${coord.x}:${coord.y}`

/**
 * 把数值限制在指定闭区间内。
 *
 * @param value 原始数值。
 * @param min 允许的最小值。
 * @param max 允许的最大值。
 * @returns 如果 value 超出范围，返回边界值；否则返回 value。
 */
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * 把单元格 y 坐标转换为世界 y 方向。
 *
 * @param cellY 单元格 y 坐标，项目约定向上递增。
 * @returns 世界坐标中的 y 值方向，向下为正。
 */
export const cellToWorldY = (cellY: number) => -cellY

/**
 * 把世界 y 坐标转换为单元格 y 方向。
 *
 * @param worldY 世界坐标中的 y 值。
 * @returns 单元格坐标中的 y 值方向。
 */
export const worldToCellY = (worldY: number) => -worldY

/**
 * 把屏幕坐标转换为所在的单元格坐标。
 *
 * @param screenX 屏幕 x 坐标。
 * @param screenY 屏幕 y 坐标。
 * @param camera 当前相机位置。
 * @param zoom 当前缩放倍数。
 * @param viewportWidth 当前视口宽度。
 * @param viewportHeight 当前视口高度。
 * @returns 屏幕点命中的单元格坐标。
 */
export const screenToCell = (
  screenX: number,
  screenY: number,
  camera: Camera,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
) => {
  const world = screenToWorldPoint(screenX, screenY, camera, zoom, viewportWidth, viewportHeight)

  return {
    x: Math.floor(world.x / CELL_SIZE),
    y: Math.floor(worldToCellY(world.y) / CELL_SIZE),
  }
}

/**
 * 把世界坐标转换为所在的单元格坐标。
 *
 * @param worldPoint 世界坐标点。
 * @returns 该世界点所在的单元格坐标。
 */
export const worldToCellCoord = (worldPoint: Point): Coord => ({
  x: Math.floor(worldPoint.x / CELL_SIZE),
  y: Math.floor(worldToCellY(worldPoint.y) / CELL_SIZE),
})

/**
 * 计算单元格在世界坐标系中的边界。
 *
 * @param coord 单元格坐标。
 * @returns 包含 left、right、top、bottom 的世界坐标边界。
 */
export const cellBoundsInWorld = (coord: Coord) => ({
  left: coord.x * CELL_SIZE,
  right: (coord.x + 1) * CELL_SIZE,
  top: cellToWorldY(coord.y + 1) * CELL_SIZE,
  bottom: cellToWorldY(coord.y) * CELL_SIZE,
})

/**
 * 创建绑定了当前视图状态的透视网格工具对象。
 *
 * @param view 当前相机、缩放和视口状态。
 * @returns 一组基于当前视图的坐标转换、单元格投影和可见范围方法。
 */
export function createPerspectiveGrid(view: GridView) {
  const { camera, zoom, viewport } = view

  return {
    camera,
    zoom,
    viewport,
    screenToWorld: (point: Point) => screenToWorldPoint(point.x, point.y, camera, zoom, viewport.width, viewport.height),
    worldToScreen: (point: Point) => worldToScreenPoint(point.x, point.y, camera, zoom, viewport.width, viewport.height),
    screenToCell: (point: Point) => screenToCell(point.x, point.y, camera, zoom, viewport.width, viewport.height),
    cellRect: (coord: Coord) => getCellRect(coord, camera, zoom, viewport.width, viewport.height),
    cameraForAnchor: (worldPoint: Point, screenPoint: Point, nextZoom = zoom) =>
      getCameraForAnchor(worldPoint, screenPoint, nextZoom, viewport.width, viewport.height),
    isDrawableCell: (rect: CellRect) => isDrawableCell(rect, viewport.width, viewport.height),
    visibleRange: (padding = 3) => getVisibleGridRange(view, padding),
  }
}

/** 透视网格工具对象的类型，由 `createPerspectiveGrid` 自动推导。 */
export type PerspectiveGrid = ReturnType<typeof createPerspectiveGrid>

/**
 * 计算当前视口需要绘制的网格坐标范围。
 *
 * @param view 当前相机、缩放和视口状态。
 * @param padding 额外扩展的网格数量，用来避免边缘露空。
 * @returns 可见网格的起止坐标范围。
 */
export function getVisibleGridRange({ camera, zoom, viewport }: GridView, padding = 3): GridRange {
  const visibleCorners = [
    screenToWorldPoint(0, 0, camera, zoom, viewport.width, viewport.height),
    screenToWorldPoint(viewport.width, 0, camera, zoom, viewport.width, viewport.height),
    screenToWorldPoint(0, viewport.height, camera, zoom, viewport.width, viewport.height),
    screenToWorldPoint(viewport.width, viewport.height, camera, zoom, viewport.width, viewport.height),
  ]
  const visibleXs = visibleCorners.map((point) => point.x)
  const visibleYs = visibleCorners.map((point) => point.y)

  return {
    startX: Math.floor(Math.min(...visibleXs) / CELL_SIZE) - padding,
    endX: Math.ceil(Math.max(...visibleXs) / CELL_SIZE) + padding,
    startY: Math.floor(Math.min(...visibleYs) / CELL_SIZE) - padding,
    endY: Math.ceil(Math.max(...visibleYs) / CELL_SIZE) + padding,
  }
}

/**
 * 计算单元格投影到屏幕后的四边形和包围盒。
 *
 * @param coord 单元格坐标。
 * @param camera 当前相机位置。
 * @param zoom 当前缩放倍数。
 * @param viewportWidth 当前视口宽度。
 * @param viewportHeight 当前视口高度。
 * @returns 单元格在屏幕上的投影矩形信息。
 */
export function getCellRect(
  coord: Coord,
  camera: Camera,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): CellRect {
  const topWorldY = cellToWorldY(coord.y + 1) * CELL_SIZE
  const bottomWorldY = cellToWorldY(coord.y) * CELL_SIZE
  const points = [
    worldToScreenPoint(coord.x * CELL_SIZE, topWorldY, camera, zoom, viewportWidth, viewportHeight),
    worldToScreenPoint((coord.x + 1) * CELL_SIZE, topWorldY, camera, zoom, viewportWidth, viewportHeight),
    worldToScreenPoint((coord.x + 1) * CELL_SIZE, bottomWorldY, camera, zoom, viewportWidth, viewportHeight),
    worldToScreenPoint(coord.x * CELL_SIZE, bottomWorldY, camera, zoom, viewportWidth, viewportHeight),
  ]
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)

  return {
    left,
    top,
    right,
    bottom,
    size: CELL_SIZE * zoom,
    width: right - left,
    height: bottom - top,
    points,
  }
}

/**
 * 获取透视投影中心点。
 *
 * @param viewportWidth 当前视口宽度。
 * @param viewportHeight 当前视口高度。
 * @returns 屏幕中心点坐标。
 */
export const getProjectionCenter = (viewportWidth: number, viewportHeight: number) => ({
  x: viewportWidth / 2,
  y: viewportHeight / 2,
})

/**
 * 根据相对 y 坐标计算透视缩放比例。
 *
 * @param relativeY 世界点相对相机的 y 距离。
 * @returns 用于屏幕投影的缩放比例。
 */
export const getPerspectiveScale = (relativeY: number) => 1 / (1 - relativeY * PERSPECTIVE_STRENGTH)

/**
 * 把世界坐标投影为屏幕坐标。
 *
 * @param worldX 世界 x 坐标。
 * @param worldY 世界 y 坐标。
 * @param nextCamera 用于投影的相机位置。
 * @param nextZoom 用于投影的缩放倍数。
 * @param viewportWidth 当前视口宽度。
 * @param viewportHeight 当前视口高度。
 * @returns 投影后的屏幕坐标。
 */
export const worldToScreenPoint = (
  worldX: number,
  worldY: number,
  nextCamera: Camera,
  nextZoom: number,
  viewportWidth: number,
  viewportHeight: number,
) => {
  const center = getProjectionCenter(viewportWidth, viewportHeight)
  const relativeY = worldY - nextCamera.y
  const scale = getPerspectiveScale(relativeY)

  return {
    x: center.x + (worldX - nextCamera.x) * nextZoom * scale,
    y: center.y + relativeY * nextZoom * PERSPECTIVE_Y_SCALE * scale,
  }
}

/**
 * 把屏幕坐标反解为世界坐标。
 *
 * @param screenX 屏幕 x 坐标。
 * @param screenY 屏幕 y 坐标。
 * @param nextCamera 当前相机位置。
 * @param nextZoom 当前缩放倍数。
 * @param viewportWidth 当前视口宽度。
 * @param viewportHeight 当前视口高度。
 * @returns 对应的世界坐标。
 */
export const screenToWorldPoint = (
  screenX: number,
  screenY: number,
  nextCamera: Camera,
  nextZoom: number,
  viewportWidth: number,
  viewportHeight: number,
) => {
  const center = getProjectionCenter(viewportWidth, viewportHeight)
  const k = (screenY - center.y) / (nextZoom * PERSPECTIVE_Y_SCALE)
  const relativeY = k / (1 + PERSPECTIVE_STRENGTH * k)
  const scale = getPerspectiveScale(relativeY)

  return {
    y: nextCamera.y + relativeY,
    x: nextCamera.x + (screenX - center.x) / (nextZoom * scale),
  }
}

/**
 * 计算保持某个世界点贴住某个屏幕点时所需的相机位置。
 *
 * @param worldPoint 需要锚定的世界坐标点。
 * @param screenPoint 目标屏幕坐标点。
 * @param nextZoom 即将应用的缩放倍数。
 * @param viewportWidth 当前视口宽度。
 * @param viewportHeight 当前视口高度。
 * @returns 新相机位置。
 */
export const getCameraForAnchor = (
  worldPoint: Coord,
  screenPoint: { x: number; y: number },
  nextZoom: number,
  viewportWidth: number,
  viewportHeight: number,
): Camera => {
  const center = getProjectionCenter(viewportWidth, viewportHeight)
  const k = (screenPoint.y - center.y) / (nextZoom * PERSPECTIVE_Y_SCALE)
  const relativeY = k / (1 + PERSPECTIVE_STRENGTH * k)
  const scale = getPerspectiveScale(relativeY)

  return {
    y: worldPoint.y - relativeY,
    x: worldPoint.x - (screenPoint.x - center.x) / (nextZoom * scale),
  }
}

/**
 * 根据四个投影点绘制一个向中心收缩后的单元格路径。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param points 单元格四个角点，按左上、右上、右下、左下顺序传入。
 * @param inset 向中心收缩的屏幕像素距离。
 * @returns 无返回值，副作用是在 context 当前路径中写入闭合路径。
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
 * 判断单元格投影是否值得绘制。
 *
 * @param rect 单元格投影后的矩形信息。
 * @param viewportWidth 当前视口宽度。
 * @param viewportHeight 当前视口高度。
 * @returns 如果单元格与视口附近相交且投影尺寸合理，返回 true。
 */
export function isDrawableCell(rect: CellRect, viewportWidth: number, viewportHeight: number) {
  const margin = 160
  const intersectsViewport =
    rect.right >= -margin &&
    rect.left <= viewportWidth + margin &&
    rect.bottom >= -margin &&
    rect.top <= viewportHeight + margin
  const saneProjection = rect.width <= MAX_CELL_DRAW_WIDTH && rect.height <= MAX_CELL_DRAW_HEIGHT

  return intersectsViewport && saneProjection
}

/**
 * 三次缓入缓出动画曲线。
 *
 * @param t 动画进度，通常在 0 到 1 之间。
 * @returns 平滑后的进度值。
 */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * 计算让指定单元格中心居中时的相机位置。
 *
 * @param coord 目标单元格坐标。
 * @returns 相机应移动到的世界坐标位置。
 */
export function cameraForCellCenter(coord: Coord): Camera {
  return {
    x: (coord.x + 0.5) * CELL_SIZE,
    y: cellToWorldY(coord.y + 0.5) * CELL_SIZE,
  }
}
