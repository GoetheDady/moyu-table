import { PERSPECTIVE_STRENGTH, PERSPECTIVE_Y_SCALE } from './constants'
import type { Camera } from './types'

/** 表示二维平面中的一个点。 */
type Point = {
  x: number
  y: number
}

/**
 * 获取透视投影中心点。
 */
export const getProjectionCenter = (viewportWidth: number, viewportHeight: number) => ({
  x: viewportWidth / 2,
  y: viewportHeight / 2,
})

/**
 * 根据相对 y 坐标计算透视缩放比例。
 */
export const getPerspectiveScale = (relativeY: number) => 1 / (1 - relativeY * PERSPECTIVE_STRENGTH)

/**
 * 把世界坐标投影为屏幕坐标。
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
