import { describe, expect, test } from 'vitest'
import { initialCells } from '../src/data/demoCells'
import { getCellPreview } from '../src/domain/cells/cellPreview'
import { CELL_SIZE } from '../src/domain/cells/constants'
import {
  cameraForCellCenter,
  cellBoundsInWorld,
  createPerspectiveGrid,
  worldToCellCoord,
} from '../src/domain/cells/geometry'
import { getProjectedTextBox } from '../src/domain/cells/text'
import { beginWallPointer, hoverWallAtPoint } from '../src/features/wall/wallInteraction'

describe('架构约束检查', () => {
  /**
   * 验证世界坐标、单元格坐标和相邻格子边界保持同一套方向约定。
   *
   * 世界坐标是画布里的连续坐标；单元格坐标是网格里的整数坐标。
   * 这个测试防止上下方向或左右方向在后续重构时被反向。
   */
  test('保持世界坐标和单元格坐标对齐', () => {
    const cases = [
      { name: 'origin', world: { x: 48, y: -48 }, expected: { x: 0, y: 0 } },
      { name: 'right of origin', world: { x: 144, y: -48 }, expected: { x: 1, y: 0 } },
      { name: 'left of origin', world: { x: -48, y: -48 }, expected: { x: -1, y: 0 } },
      { name: 'above origin', world: { x: 48, y: -144 }, expected: { x: 0, y: 1 } },
      { name: 'below origin', world: { x: 48, y: 48 }, expected: { x: 0, y: -1 } },
    ]

    for (const testCase of cases) {
      expect(worldToCellCoord(testCase.world), testCase.name).toEqual(testCase.expected)
    }

    const originBounds = cellBoundsInWorld({ x: 0, y: 0 })
    const aboveBounds = cellBoundsInWorld({ x: 0, y: 1 })
    const leftBounds = cellBoundsInWorld({ x: -1, y: 0 })

    expect(aboveBounds.bottom).toBe(originBounds.top)
    expect(leftBounds.right).toBe(originBounds.left)
  })

  /**
   * 验证跳转到指定单元格时，相机位置会让目标格子中心落在视口中心。
   *
   * 相机是当前观察画布的位置；视口是用户屏幕上实际可见的区域。
   */
  test('跳转目标会居中显示在视口内', () => {
    const viewport = { width: 2048, height: 1058 }
    const zoom = 1
    const targets = [
      { x: 0, y: 0 },
      { x: -10, y: 13 },
      { x: 24, y: -8 },
    ]

    for (const target of targets) {
      const camera = cameraForCellCenter(target)
      const grid = createPerspectiveGrid({ camera, zoom, viewport })
      const screen = grid.worldToScreen(camera)

      expect(Math.abs(screen.x - viewport.width / 2), `target ${JSON.stringify(target)} x`).toBeLessThanOrEqual(
        0.001,
      )
      expect(Math.abs(screen.y - viewport.height / 2), `target ${JSON.stringify(target)} y`).toBeLessThanOrEqual(
        0.001,
      )
    }
  })

  /**
   * 验证透视网格在屏幕右上角仍有足够线条覆盖，并且拖拽状态不会触发墙面 hover。
   *
   * hover 是指鼠标或指针悬停命中的交互状态；拖拽时抑制 hover 可以避免误操作。
   */
  test('保持足够的可见网格覆盖并抑制拖拽 hover', () => {
    const viewport = { width: 2048, height: 1058 }
    const camera = { x: 0, y: 32 }
    const zoom = 1
    const grid = createPerspectiveGrid({ camera, zoom, viewport })
    const topRightRegion = {
      left: viewport.width * 0.78,
      right: viewport.width - 1,
      top: 0,
      bottom: viewport.height * 0.22,
    }

    const count = countLinesInRegion(grid.visibleRange(), topRightRegion, grid)

    expect(count).toBeGreaterThanOrEqual(6)

    const cornerPoint = { x: viewport.width * 0.95, y: viewport.height * 0.05 }
    const session = beginWallPointer(1, cornerPoint, grid)
    const dragHover = hoverWallAtPoint({ x: cornerPoint.x - 12, y: cornerPoint.y + 8 }, grid, session.isDragging)

    expect(dragHover).toBeNull()
  })

  /**
   * 验证可绘制单元格不会因为透视投影产生过大的包围盒。
   *
   * 包围盒是元素投影到屏幕后的外接矩形；过大的包围盒通常表示透视计算异常。
   */
  test('不绘制投影包围盒异常过大的单元格', () => {
    const viewport = { width: 2048, height: 1058 }
    const zoom = 1
    const cameras = [
      { name: 'initial', value: { x: 0, y: 32 } },
      { name: 'near selected y13', value: { x: -960, y: -1248 } },
    ]

    for (const camera of cameras) {
      const grid = createPerspectiveGrid({ camera: camera.value, zoom, viewport })
      const drawnExtremeBoxes = initialCells
        .map((cell) => grid.cellRect(cell))
        .filter((box) => grid.isDrawableCell(box) && (box.width > 260 || box.height > 180))

      expect(drawnExtremeBoxes, camera.name).toHaveLength(0)
    }
  })

  /**
   * 验证投影文字的局部坐标轴跟随格子斜边，同时保持可读尺寸。
   *
   * 局部坐标轴是文字盒子自己的方向参考，用来让文字贴合透视后的单元格。
   */
  test('保持投影文字对齐且可读', () => {
    const viewport = { width: 2048, height: 1058 }
    const grid = createPerspectiveGrid({
      camera: { x: 0, y: 32 },
      zoom: 1,
      viewport,
    })
    const projectedTextBox = getProjectedTextBox(grid.cellRect({ x: 4, y: -1 }).points)

    expect(Math.abs(projectedTextBox.yAxis.x)).toBeGreaterThanOrEqual(0.001)
    expect(Math.abs(projectedTextBox.yAxis.x)).toBeLessThanOrEqual(Math.abs(projectedTextBox.yAxis.y))
    expect(projectedTextBox.width).toBeGreaterThan(0)
    expect(projectedTextBox.height).toBeGreaterThan(0)
  })

  /**
   * 验证单元格封面会从内容块自动提取标题和类型标签。
   *
   * 封面预览是格子未点开时的主要信息来源，必须在没有图片时也能稳定生成。
   */
  test('从文字内容块自动生成封面预览', () => {
    const preview = getCellPreview(initialCells[0])

    expect(preview).toMatchObject({
      source: 'template',
      template: 'text',
      title: '保持热爱',
      subtitle: '奔赴山海',
      label: '文字',
    })
  })

  /**
   * 验证手动封面配置会优先于自动封面生成。
   *
   * previewOverride 是未来用户自定义封面的扩展点，不能被自动推导覆盖。
   */
  test('优先使用手动封面配置', () => {
    const preview = getCellPreview({
      ...initialCells[0],
      previewOverride: {
        source: 'template',
        template: 'question',
        title: '自定义封面',
        label: '问题',
      },
    })

    expect(preview).toMatchObject({
      template: 'question',
      title: '自定义封面',
      label: '问题',
    })
  })
})

/**
 * 判断一条线段是否与矩形区域相交。
 *
 * @param a 线段起点，使用屏幕坐标。
 * @param b 线段终点，使用屏幕坐标。
 * @param rect 待检测的矩形区域，包含 left、right、top、bottom 四条边。
 * @returns 如果线段采样点落入矩形区域内，返回 true；否则返回 false。
 *
 * 边界条件：这里使用固定数量采样点近似判断，适合测试网格覆盖密度，
 * 不适合作为精确几何相交算法用于运行时逻辑。
 */
function segmentIntersectsRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rect: { left: number; right: number; top: number; bottom: number },
): boolean {
  const samples = 80

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t

    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return true
    }
  }

  return false
}

/**
 * 统计可见网格范围内有多少条横线或竖线穿过指定屏幕区域。
 *
 * @param range 当前透视网格计算出的可见单元格范围。
 * @param rect 需要统计覆盖情况的屏幕矩形区域。
 * @param grid 透视网格实例，用来把世界坐标转换为屏幕坐标。
 * @returns 穿过指定矩形区域的网格线数量。
 *
 * 副作用：无。该函数只做坐标转换和计数，不修改传入对象。
 */
function countLinesInRegion(
  range: { startX: number; endX: number; startY: number; endY: number },
  rect: { left: number; right: number; top: number; bottom: number },
  grid: ReturnType<typeof createPerspectiveGrid>,
): number {
  let count = 0

  for (let x = range.startX; x <= range.endX; x += 1) {
    const start = grid.worldToScreen({ x: x * CELL_SIZE, y: range.startY * CELL_SIZE })
    const end = grid.worldToScreen({ x: x * CELL_SIZE, y: range.endY * CELL_SIZE })

    if (segmentIntersectsRect(start, end, rect)) {
      count += 1
    }
  }

  for (let y = range.startY; y <= range.endY; y += 1) {
    const start = grid.worldToScreen({ x: range.startX * CELL_SIZE, y: y * CELL_SIZE })
    const end = grid.worldToScreen({ x: range.endX * CELL_SIZE, y: y * CELL_SIZE })

    if (segmentIntersectsRect(start, end, rect)) {
      count += 1
    }
  }

  return count
}
