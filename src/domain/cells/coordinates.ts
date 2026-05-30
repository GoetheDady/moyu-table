import { CELL_SIZE } from './constants'
import type { Coord } from './types'

/** 表示二维平面中的一个点。 */
type Point = {
  x: number
  y: number
}

/**
 * 生成稳定的坐标键，用于比较或查找同一个网格坐标。
 */
export const coordKey = (coord: Coord) => `${coord.x}:${coord.y}`

/**
 * 把数值限制在指定闭区间内。
 */
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * 把单元格 y 坐标转换为世界 y 方向——向上递增转向下为正。
 */
export const cellToWorldY = (cellY: number) => -cellY

/**
 * 把世界 y 坐标转换为单元格 y 方向——向下为正转向上递增。
 */
export const worldToCellY = (worldY: number) => -worldY

/**
 * 把世界坐标转换为所在的单元格坐标。
 */
export const worldToCellCoord = (worldPoint: Point): Coord => ({
  x: Math.floor(worldPoint.x / CELL_SIZE),
  y: Math.floor(worldToCellY(worldPoint.y) / CELL_SIZE),
})

/**
 * 计算单元格在世界坐标系中的边界。
 */
export const cellBoundsInWorld = (coord: Coord) => ({
  left: coord.x * CELL_SIZE,
  right: (coord.x + 1) * CELL_SIZE,
  top: cellToWorldY(coord.y + 1) * CELL_SIZE,
  bottom: cellToWorldY(coord.y) * CELL_SIZE,
})
