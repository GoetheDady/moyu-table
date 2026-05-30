import { describe, expect, test } from 'vitest'
import {
  getVisibleCellLoadError,
  mergeVisibleCells,
  runVisibleCellLoad,
} from '../src/features/wall/visibleCellLoading'
import type { CellClient } from '../src/data/cellClient'
import type { PerspectiveGrid } from '../src/domain/cells/geometry'
import type { Cell } from '../src/domain/cells/types'

const visibleCell: Cell = {
  id: 'visible-cell',
  x: 1,
  y: 2,
  blocks: [{ id: 'visible-cell:block', type: 'text', content: '可见内容' }],
  createdAt: '2026-05-29T10:00:00.000Z',
  tone: 'cyan',
}

const createdCell: Cell = {
  id: 'created-cell',
  x: -4,
  y: 3,
  blocks: [{ id: 'created-cell:block', type: 'text', content: '新内容' }],
  createdAt: '2026-05-29T11:00:00.000Z',
  tone: 'amber',
}

describe('Visible cell loading', () => {
  /**
   * 验证新写入格子会合并到当前可见列表，重复坐标不会重复追加。
   *
   * 可见列表是 Canvas 当前渲染使用的格子集合，合并规则集中后 AppWall 不需要重复判断坐标。
   */
  test('合并刚创建的可见格子', () => {
    const currentCells = [visibleCell]
    const duplicatedCells = mergeVisibleCells(currentCells, { ...createdCell, x: 1, y: 2 })

    expect(mergeVisibleCells([visibleCell], createdCell)).toEqual([visibleCell, createdCell])
    expect(duplicatedCells).toBe(currentCells)
  })

  /**
   * 验证客户端读取结果会被翻译成界面错误状态。
   *
   * undefined 表示保留当前错误状态，适合忽略已经取消的过期请求。
   */
  test('翻译读取结果的错误状态', () => {
    expect(getVisibleCellLoadError({ status: 'loaded', cells: [visibleCell] })).toBeNull()
    expect(getVisibleCellLoadError({ status: 'request-failed' })).toBe(
      '附近格子暂时加载失败，移动或缩放时会自动重试。',
    )
    expect(getVisibleCellLoadError({ status: 'aborted' })).toBeUndefined()
  })

  /**
   * 验证可见格子读取执行函数会把范围、取消信号和状态回调集中起来。
   *
   * 取消信号是 AbortSignal，用来停止视口变化后已经过期的网络请求。
   */
  test('执行一次可见范围读取并更新格子列表', async () => {
    const abortController = new AbortController()
    const loadedCells: Cell[][] = []
    const loadErrors: Array<string | null> = []
    const visibleRange = { minX: -1, maxX: 2, minY: 3, maxY: 5 }
    const grid = createGridWithVisibleRange(visibleRange)
    const cellClient = createCellClientStub(async (range, options) => {
      expect(range).toEqual(visibleRange)
      expect(options?.signal).toBe(abortController.signal)

      return { status: 'loaded', cells: [visibleCell] }
    })

    await runVisibleCellLoad({
      grid,
      cellClient,
      signal: abortController.signal,
      onCellsLoaded: (cells) => loadedCells.push(cells),
      onLoadErrorChange: (error) => loadErrors.push(error),
    })

    expect(loadedCells).toEqual([[visibleCell]])
    expect(loadErrors).toEqual([null])
  })

  /**
   * 验证取消的可见范围读取不会清空已有错误。
   *
   * @returns Promise，无显式返回值；断言 aborted 结果不会触发错误回调。
   */
  test('忽略已取消的可见范围读取结果', async () => {
    const loadedCells: Cell[][] = []
    const loadErrors: Array<string | null> = []

    await runVisibleCellLoad({
      grid: createGridWithVisibleRange({ minX: 0, maxX: 0, minY: 0, maxY: 0 }),
      cellClient: createCellClientStub(async () => ({ status: 'aborted' })),
      signal: new AbortController().signal,
      onCellsLoaded: (cells) => loadedCells.push(cells),
      onLoadErrorChange: (error) => loadErrors.push(error),
    })

    expect(loadedCells).toEqual([])
    expect(loadErrors).toEqual([])
  })
})

/**
 * 创建只暴露 visibleCellRange 的测试网格。
 *
 * @param range 需要让测试网格返回的可见坐标范围。
 * @returns 可传入可见格子加载函数的透视网格替身。
 */
function createGridWithVisibleRange(range: ReturnType<PerspectiveGrid['visibleCellRange']>): PerspectiveGrid {
  return {
    visibleCellRange: () => range,
  } as PerspectiveGrid
}

/**
 * 创建测试用格子客户端。
 *
 * @param listCellsInRange 需要验证的范围读取行为。
 * @returns 满足 CellClient Interface 的测试替身。
 */
function createCellClientStub(listCellsInRange: CellClient['listCellsInRange']): CellClient {
  return {
    listCellsInRange,
    createCell: async () => ({ status: 'request-failed' }),
  }
}
