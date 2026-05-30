import { CELL_SIZE, PERSPECTIVE_STRENGTH, PERSPECTIVE_Y_SCALE } from './constants'
import { getPerspectiveScale, getProjectionCenter } from './projection'
import type { Camera, Coord } from './types'
import { cellToWorldY } from './coordinates'

/**
 * 计算保持某个世界点贴住某个屏幕点时所需的相机位置。
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
 * 计算让指定单元格中心居中时的相机位置。
 */
export function cameraForCellCenter(coord: Coord): Camera {
  return {
    x: (coord.x + 0.5) * CELL_SIZE,
    y: cellToWorldY(coord.y + 0.5) * CELL_SIZE,
  }
}

/**
 * 三次缓入缓出动画曲线。
 */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
