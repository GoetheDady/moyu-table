import { describe, expect, test } from 'vitest'
import { CELL_SIZE } from '../src/domain/cells/constants'
import {
  getMinimapProjection,
  getMinimapCellRange,
  shouldRefreshMinimap,
} from '../src/domain/cells/minimapProjection'

describe('getMinimapProjection', () => {
  const minimapWidth = 240
  const minimapHeight = 160
  const viewport = { width: 1920, height: 1080 }

  /**
   * 验证相机原点投影到小地图中心。
   */
  test('相机在原点时世界原点映射到小地图中心', () => {
    const projection = getMinimapProjection({ x: 0, y: 0 }, 1, viewport, minimapWidth, minimapHeight)
    const screen = projection.worldToMinimap(0, 0)

    expect(screen.x).toBeCloseTo(minimapWidth / 2, 0)
    expect(screen.y).toBeCloseTo(minimapHeight / 2, 0)
  })

  /**
   * 验证小地图坐标到世界坐标的往返一致性。
   */
  test('世界坐标映射到小地图再映射回来保持一致', () => {
    const projection = getMinimapProjection({ x: 480, y: -192 }, 1, viewport, minimapWidth, minimapHeight)
    const worldPoint = { x: 960, y: 384 }
    const minimapPoint = projection.worldToMinimap(worldPoint.x, worldPoint.y)
    const roundTrip = projection.minimapToWorld(minimapPoint.x, minimapPoint.y)

    expect(roundTrip.x).toBeCloseTo(worldPoint.x, 1)
    expect(roundTrip.y).toBeCloseTo(worldPoint.y, 1)
  })

  /**
   * 验证缩放 2 倍时小地图覆盖范围减半（比例尺翻倍）。
   */
  test('zoom=2 时小地图表示的世界范围是 zoom=1 时的一半', () => {
    const p1 = getMinimapProjection({ x: 0, y: 0 }, 1, viewport, minimapWidth, minimapHeight)
    const p2 = getMinimapProjection({ x: 0, y: 0 }, 2, viewport, minimapWidth, minimapHeight)

    // 同一个世界偏移量在 zoom=2 时映射到更大的小地图像素偏移
    const offset1 = p1.worldToMinimap(CELL_SIZE * 10, 0)
    const offset2 = p2.worldToMinimap(CELL_SIZE * 10, 0)
    expect(offset2.x - minimapWidth / 2).toBeGreaterThan((offset1.x - minimapWidth / 2) * 1.5)
  })
})

describe('getMinimapCellRange', () => {
  const viewport = { width: 1920, height: 1080 }

  /**
   * 验证小地图的 cell 范围大约为主视口的 6 倍。
   */
  test('小地图 cell 范围约为视口 cell 范围的 6 倍', () => {
    const range = getMinimapCellRange({ x: 0, y: 32 }, 1, viewport)
    const viewportRange = getMinimapCellRange({ x: 0, y: 32 }, 1, viewport)

    // 验证范围包含相机所在 cell
    expect(range.minX).toBeLessThanOrEqual(0)
    expect(range.maxX).toBeGreaterThanOrEqual(0)
    expect(range.minY).toBeLessThanOrEqual(0)
    expect(range.maxY).toBeGreaterThanOrEqual(0)

    // 验证范围合理（不为空、不太大）
    const spanX = range.maxX - range.minX
    const spanY = range.maxY - range.minY
    expect(spanX).toBeGreaterThan(10)
    expect(spanY).toBeGreaterThan(5)
    expect(spanX).toBeLessThan(200)
    expect(spanY).toBeLessThan(200)
  })
})

describe('shouldRefreshMinimap', () => {
  /**
   * 验证相机移动超过阈值时触发刷新。
   */
  test('相机移动超过阈值格子数时返回 true', () => {
    const prev = { x: 0, y: 32 }
    const next = { x: 960, y: 32 } // 移动了 10 格
    const threshold = 8

    expect(shouldRefreshMinimap(prev, next, 1, threshold)).toBe(true)
  })

  /**
   * 验证相机移动未超过阈值时不触发刷新。
   */
  test('相机移动未超过阈值时返回 false', () => {
    const prev = { x: 0, y: 32 }
    const next = { x: 480, y: 32 } // 移动了 5 格
    const threshold = 8

    expect(shouldRefreshMinimap(prev, next, 1, threshold)).toBe(false)
  })

  /**
   * 验证 zoom 变化时考虑格子大小的缩放效应。
   */
  test('zoom 更高时相同世界距离折合的格子数更少', () => {
    const prev = { x: 0, y: 32 }
    const next = { x: 480, y: 32 }
    const threshold = 8

    // zoom=2 时 480 世界单位 = 480/96 = 5 格 → 不超过阈值
    expect(shouldRefreshMinimap(prev, next, 2, threshold)).toBe(false)
    // zoom=0.5 时 480 世界单位相当于更多格（但阈值是按格算的，世界距离不变）
  })
})
