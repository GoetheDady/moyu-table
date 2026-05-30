import {
  CELL_SIZE,
  MAX_CELL_DRAW_HEIGHT,
  MAX_CELL_DRAW_WIDTH,
} from './constants'
import {
  cellBoundsInWorld,
  cellToWorldY,
  clamp,
  coordKey,
  worldToCellCoord,
  worldToCellY,
} from './coordinates'
import {
  screenToWorldPoint,
  worldToScreenPoint,
} from './projection'
import {
  cameraForCellCenter,
  easeInOutCubic,
  getCameraForAnchor,
} from './camera'
import type { Camera, CellRect, Coord } from './types'

// Re-export from submodules for stable public API
export {
  // coordinates
  cellBoundsInWorld,
  cellToWorldY,
  clamp,
  coordKey,
  worldToCellCoord,
  worldToCellY,
  // projection
  screenToWorldPoint,
  worldToScreenPoint,
  // camera
  cameraForCellCenter,
  easeInOutCubic,
  getCameraForAnchor,
}

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

/** 表示当前视口绘制网格线时需要覆盖的世界网格索引范围（y 为世界方向）。 */
export type WorldGridRange = {
  startX: number
  endX: number
  startY: number
  endY: number
}

/** 表示当前视口读取格子内容时需要覆盖的单元格坐标范围（y 为单元格方向，向上递增）。 */
export type CellRange = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** 表示二维平面中的一个点。 */
type Point = {
  x: number
  y: number
}

/**
 * 把屏幕坐标转换为所在的单元格坐标。
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
 * 创建绑定了当前视图状态的透视网格工具对象。
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
    visibleWorldGridRange: (padding = 3) => getVisibleWorldGridRange(view, padding),
    visibleCellRange: (padding = 3) => getVisibleCellRange(view, padding),
  }
}

/** 透视网格工具对象的类型，由 `createPerspectiveGrid` 自动推导。 */
export type PerspectiveGrid = ReturnType<typeof createPerspectiveGrid>

/**
 * 计算当前视口需要绘制的世界网格线索引范围。
 */
export function getVisibleWorldGridRange(view: GridView, padding = 3): WorldGridRange {
  const visibleCorners = getVisibleWorldCorners(view)
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
 * 计算当前视口需要读取内容的单元格坐标范围。
 */
export function getVisibleCellRange(view: GridView, padding = 3): CellRange {
  const visibleCorners = getVisibleWorldCorners(view)
  const visibleXs = visibleCorners.map((point) => point.x)
  const visibleCellYs = visibleCorners.map((point) => worldToCellY(point.y))

  return {
    minX: Math.floor(Math.min(...visibleXs) / CELL_SIZE) - padding,
    maxX: Math.ceil(Math.max(...visibleXs) / CELL_SIZE) + padding,
    minY: Math.floor(Math.min(...visibleCellYs) / CELL_SIZE) - padding,
    maxY: Math.ceil(Math.max(...visibleCellYs) / CELL_SIZE) + padding,
  }
}

/**
 * 计算当前视口四个角在世界坐标系中的位置。
 */
function getVisibleWorldCorners({ camera, zoom, viewport }: GridView): Point[] {
  return [
    screenToWorldPoint(0, 0, camera, zoom, viewport.width, viewport.height),
    screenToWorldPoint(viewport.width, 0, camera, zoom, viewport.width, viewport.height),
    screenToWorldPoint(0, viewport.height, camera, zoom, viewport.width, viewport.height),
    screenToWorldPoint(viewport.width, viewport.height, camera, zoom, viewport.width, viewport.height),
  ]
}

/**
 * 计算单元格投影到屏幕后的四边形和包围盒。
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
 * 判断单元格投影是否值得绘制。
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
