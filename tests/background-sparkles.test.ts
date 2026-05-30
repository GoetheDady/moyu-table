import { describe, expect, test } from 'vitest'
import { hashCoord, generateSparkles, computeSparkleAnimation, type WorldBounds } from '../src/features/wall/wallBackgroundLayer'

const SPARKLE_CELL_SIZE = 3 * 96 // 每 3 个网格 cell = 288 世界单位

describe('hashCoord', () => {
  /**
   * 验证相同坐标产生相同哈希值（确定性）。
   */
  test('相同输入产生相同哈希值', () => {
    expect(hashCoord(3, -2)).toBe(hashCoord(3, -2))
    expect(hashCoord(0, 0)).toBe(hashCoord(0, 0))
  })

  /**
   * 验证不同坐标大概率产生不同哈希值。
   */
  test('不同输入产生不同哈希值', () => {
    expect(hashCoord(1, 0)).not.toBe(hashCoord(2, 0))
    expect(hashCoord(0, 1)).not.toBe(hashCoord(0, 2))
  })

  /**
   * 验证哈希值在 [0, 1) 范围内。
   */
  test('哈希值在 0 到 1 之间', () => {
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        const h = hashCoord(x, y)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThan(1)
      }
    }
  })
})

describe('generateSparkles', () => {
  /**
   * 验证按固定世界间距生成点点。
   */
  test('按世界空间 cell 间距生成点点', () => {
    // 可见世界区域: 960 x 672 世界单位
    const bounds: WorldBounds = { minX: 0, maxX: 960, minY: -672, maxY: 0 }
    const sparkles = generateSparkles(bounds)

    // cell 覆盖: start-1 到 end+1（两端各加 1 padding），共 ceil(span/cellSize)+3 列/行
    const cols = Math.ceil(960 / SPARKLE_CELL_SIZE) + 3
    const rows = Math.ceil(672 / SPARKLE_CELL_SIZE) + 3
    expect(sparkles.length).toBe(cols * rows)
  })

  /**
   * 验证所有点点在世界坐标范围内。
   */
  test('点点的世界坐标在指定范围内', () => {
    const bounds: WorldBounds = { minX: 0, maxX: 576, minY: -288, maxY: 0 }
    const sparkles = generateSparkles(bounds)

    for (const s of sparkles) {
      expect(s.worldX).toBeGreaterThanOrEqual(bounds.minX - SPARKLE_CELL_SIZE * 2)
      expect(s.worldX).toBeLessThanOrEqual(bounds.maxX + SPARKLE_CELL_SIZE * 2)
      expect(s.worldY).toBeGreaterThanOrEqual(bounds.minY - SPARKLE_CELL_SIZE * 2)
      expect(s.worldY).toBeLessThanOrEqual(bounds.maxY + SPARKLE_CELL_SIZE * 2)
    }
  })

  /**
   * 验证相同区域生成相同结果（确定性）。
   */
  test('相同区域产生相同点点', () => {
    const bounds: WorldBounds = { minX: 0, maxX: 576, minY: 0, maxY: 288 }
    const a = generateSparkles(bounds)
    const b = generateSparkles(bounds)

    expect(a.length).toBe(b.length)
    for (let i = 0; i < a.length; i++) {
      expect(a[i].worldX).toBe(b[i].worldX)
      expect(a[i].worldY).toBe(b[i].worldY)
    }
  })

  /**
   * 验证相邻世界区域的重叠部分产生相同世界坐标的点点。
   *
   * 这是核心回归测试：之前用网格 cell 索引时，范围平移 1 格会导致
   * 全部点点跳到新位置。现在用固定世界空间 cell，重叠区应保持不变。
   */
  test('相邻区域的重叠部分产生相同世界坐标的点点', () => {
    // 两个相邻区域：B 相对于 A 平移了半个 SPARKLE_CELL_SIZE
    const boundsA: WorldBounds = { minX: 0, maxX: 864, minY: -576, maxY: 0 }
    const boundsB: WorldBounds = { minX: 144, maxX: 1008, minY: -576, maxY: 0 }

    const sparklesA = generateSparkles(boundsA)
    const sparklesB = generateSparkles(boundsB)

    // 构建 B 中点点世界坐标的查找集合
    const bKeys = new Set(sparklesB.map((s) => `${s.worldX.toFixed(2)},${s.worldY.toFixed(2)}`))

    // 找出 A 中落在 B 区域重叠部分的点点
    const aInOverlap = sparklesA.filter(
      (s) => s.worldX >= boundsB.minX - SPARKLE_CELL_SIZE && s.worldX <= boundsB.maxX + SPARKLE_CELL_SIZE,
    )

    let overlapCount = 0
    for (const s of aInOverlap) {
      if (bKeys.has(`${s.worldX.toFixed(2)},${s.worldY.toFixed(2)}`)) {
        overlapCount += 1
      }
    }

    // 重叠区域的点点应该全部保留——世界空间 cell 固定不变
    expect(overlapCount).toBe(aInOverlap.length)
  })
})

describe('computeSparkleAnimation', () => {
  const sparkle = {
    worldX: 480,
    worldY: -192,
    color: 'rgba(112, 245, 177, 0.72)',
    baseOpacity: 0.6,
    phase: 1.2,
    speed: 0.8,
  }

  /**
   * 验证动画结果包含偏移后的位置和呼吸后的透明度。
   */
  test('返回带偏移的屏幕位置和呼吸透明度', () => {
    const result = computeSparkleAnimation(sparkle, 1000, { x: 480, y: -192 })

    // 屏幕位置应接近世界位置（偏移不超过 ±6px）
    expect(result.screenX).toBeGreaterThanOrEqual(474)
    expect(result.screenX).toBeLessThanOrEqual(486)
    expect(result.screenY).toBeGreaterThanOrEqual(-198)
    expect(result.screenY).toBeLessThanOrEqual(-186)

    // 透明度应在 baseOpacity 附近波动
    expect(result.opacity).toBeGreaterThanOrEqual(0.2)
    expect(result.opacity).toBeLessThanOrEqual(0.9)
  })

  /**
   * 验证不同时间产生不同动画状态。
   */
  test('动画随时间变化', () => {
    const a = computeSparkleAnimation(sparkle, 0, { x: 480, y: -192 })
    const b = computeSparkleAnimation(sparkle, 500, { x: 480, y: -192 })

    // 位置或透明度至少有一个在变化
    const moved = a.screenX !== b.screenX || a.screenY !== b.screenY
    const breathed = a.opacity !== b.opacity

    expect(moved || breathed).toBe(true)
  })
})
