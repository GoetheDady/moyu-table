import { CELL_SIZE } from './constants'
import { createPerspectiveGrid, type PerspectiveGrid, type Viewport } from './geometry'
import type { Camera } from './types'

/** 小地图显示的视口倍数。 */
const MINIMAP_RANGE_FACTOR = 6

/** 小地图刷新阈值：相机移动超过多少个 cell 后才重新拉取数据。 */
const MINIMAP_REFRESH_CELL_THRESHOLD = 8

/** 小地图投影工具：世界坐标 ↔ 小地图像素坐标的双向映射。 */
export type MinimapProjection = {
  worldToMinimap: (worldX: number, worldY: number) => { x: number; y: number }
  minimapToWorld: (px: number, py: number) => { x: number; y: number }
}

/**
 * 创建小地图的正交投影工具。
 *
 * 小地图使用正交俯视投影（无透视），以相机为中心覆盖 6 倍视口的世界区域，
 * 线性映射到小地图 Canvas 尺寸上。
 *
 * @param camera 当前主画布相机位置。
 * @param zoom 当前主画布缩放倍数。
 * @param viewport 当前浏览器视口尺寸。
 * @param minimapWidth 小地图 Canvas 宽度（像素）。
 * @param minimapHeight 小地图 Canvas 高度（像素）。
 * @returns 双向映射工具对象。
 */
export function getMinimapProjection(
  camera: Camera,
  zoom: number,
  viewport: Viewport,
  minimapWidth: number,
  minimapHeight: number,
): MinimapProjection {
  const worldWidth = (viewport.width / zoom) * MINIMAP_RANGE_FACTOR
  const worldHeight = (viewport.height / zoom) * MINIMAP_RANGE_FACTOR

  const scaleX = minimapWidth / worldWidth
  const scaleY = minimapHeight / worldHeight

  return {
    worldToMinimap: (worldX: number, worldY: number) => ({
      x: (worldX - camera.x) * scaleX + minimapWidth / 2,
      y: (worldY - camera.y) * scaleY + minimapHeight / 2,
    }),
    minimapToWorld: (px: number, py: number) => ({
      x: (px - minimapWidth / 2) / scaleX + camera.x,
      y: (py - minimapHeight / 2) / scaleY + camera.y,
    }),
  }
}

/**
 * 计算小地图显示所需的 cell 查询范围。
 *
 * 基于当前视口的可见 cell 范围中心，向外扩展 6 倍得到一个更大的查询区域，
 * 用于获取"附近"的内容分布。
 *
 * @param camera 当前相机位置。
 * @param zoom 当前缩放倍数。
 * @param viewport 当前视口尺寸。
 * @param minimapWidth 小地图宽度（像素）。
 * @param minimapHeight 小地图高度（像素）。
 * @returns 小地图需要的 cell 坐标范围。
 */
export function getMinimapCellRange(
  camera: Camera,
  zoom: number,
  viewport: Viewport,
  minimapWidth = 240,
  minimapHeight = 160,
) {
  const projection = getMinimapProjection(camera, zoom, viewport, minimapWidth, minimapHeight)

  // 用小地图四角反向投影得到世界坐标边界
  const topLeft = projection.minimapToWorld(0, 0)
  const bottomRight = projection.minimapToWorld(minimapWidth, minimapHeight)

  const minWorldX = Math.min(topLeft.x, bottomRight.x)
  const maxWorldX = Math.max(topLeft.x, bottomRight.x)
  const minWorldY = Math.min(topLeft.y, bottomRight.y)
  const maxWorldY = Math.max(topLeft.y, bottomRight.y)

  return {
    minX: Math.floor(minWorldX / CELL_SIZE) - 1,
    maxX: Math.ceil(maxWorldX / CELL_SIZE) + 1,
    minY: Math.floor(-maxWorldY / CELL_SIZE) - 1,
    maxY: Math.ceil(-minWorldY / CELL_SIZE) + 1,
  }
}

/**
 * 判断相机移动是否超过小地图刷新阈值。
 *
 * @param prevCamera 上一次刷新时的相机位置。
 * @param nextCamera 当前相机位置。
 * @param zoom 当前缩放倍数。
 * @param threshold 刷新阈值（cell 数），默认为 MINIMAP_REFRESH_CELL_THRESHOLD。
 * @returns 如果相机在世界空间中移动超过阈值格子数，返回 true。
 */
export function shouldRefreshMinimap(
  prevCamera: Camera,
  nextCamera: Camera,
  zoom: number,
  threshold = MINIMAP_REFRESH_CELL_THRESHOLD,
): boolean {
  const dx = Math.abs(nextCamera.x - prevCamera.x) / CELL_SIZE
  const dy = Math.abs(nextCamera.y - prevCamera.y) / CELL_SIZE
  const distanceInCells = Math.max(dx, dy)

  return distanceInCells > threshold
}
