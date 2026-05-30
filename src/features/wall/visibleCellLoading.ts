import { useCallback, useEffect, useState } from 'react'
import type { CellClient, ListClientCellsResult } from '../../data/cellClient'
import type { PerspectiveGrid } from '../../domain/cells/geometry'
import type { Cell } from '../../domain/cells/types'

/** 视口变化后延迟读取格子的时间，用来合并连续拖拽或缩放产生的请求。 */
export const CELL_FETCH_DEBOUNCE_MS = 220

/** 表示无限格子墙当前可见格子的加载状态和写入合并入口。 */
export type VisibleCellLoadingState = {
  cells: Cell[]
  loadError: string | null
  rememberCreatedCell: (cell: Cell) => void
}

/** 表示一次可见格子读取执行所需的最小依赖。 */
export type VisibleCellLoadRunnerInput = {
  grid: PerspectiveGrid
  cellClient: CellClient
  signal: AbortSignal
  onCellsLoaded: (cells: Cell[]) => void
  onLoadErrorChange: (error: string | null) => void
}

/**
 * 根据当前透视网格自动读取可见范围内的格子。
 *
 * @param grid 当前透视网格工具对象，提供可见坐标范围。
 * @param cellClient 浏览器端格子数据访问 Module。
 * @returns 当前已加载格子、加载错误和写入成功后的本地合并入口。
 *
 * 副作用：会延迟调用 cellClient 读取 `/api/cells`，并在视图变化时取消过期请求。
 */
export function useVisibleCellLoading(grid: PerspectiveGrid, cellClient: CellClient): VisibleCellLoadingState {
  const [cells, setCells] = useState<Cell[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const timeoutId = window.setTimeout(() => {
      void runVisibleCellLoad({
        grid,
        cellClient,
        signal: controller.signal,
        onCellsLoaded: setCells,
        onLoadErrorChange: setLoadError,
      })
    }, CELL_FETCH_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [cellClient, grid])

  const rememberCreatedCell = useCallback((cell: Cell) => {
    setCells((currentCells) => mergeVisibleCells(currentCells, cell))
  }, [])

  return { cells, loadError, rememberCreatedCell }
}

/**
 * 执行一次可见格子读取，并把客户端结果翻译为界面状态回调。
 *
 * @param input 当前透视网格、格子客户端、取消信号和状态回调。
 * @returns Promise，无显式返回值；副作用是调用传入回调更新格子列表或加载错误。
 *
 * 边界条件：如果请求被取消，只保留现有错误状态，不调用 onLoadErrorChange。
 */
export async function runVisibleCellLoad(input: VisibleCellLoadRunnerInput): Promise<void> {
  const result = await input.cellClient.listCellsInRange(input.grid.visibleCellRange(), { signal: input.signal })
  const nextError = getVisibleCellLoadError(result)

  if (result.status === 'loaded') {
    input.onCellsLoaded(result.cells)
  }

  if (nextError !== undefined) {
    input.onLoadErrorChange(nextError)
  }
}

/**
 * 把刚写入成功的格子合并进当前可见格子列表。
 *
 * @param currentCells 当前可见格子列表。
 * @param created 刚从后端成功创建的格子。
 * @returns 如果坐标已经存在，返回原列表；否则返回追加后的新列表。
 */
export function mergeVisibleCells(currentCells: Cell[], created: Cell): Cell[] {
  if (currentCells.some((cell) => cell.x === created.x && cell.y === created.y)) {
    return currentCells
  }

  return [...currentCells, created]
}

/**
 * 将客户端读取结果转换为界面加载错误。
 *
 * @param result 浏览器端格子读取结果。
 * @returns string 表示需要显示错误；null 表示清空错误；undefined 表示不改变当前错误。
 */
export function getVisibleCellLoadError(result: ListClientCellsResult): string | null | undefined {
  if (result.status === 'loaded') {
    return null
  }

  if (result.status === 'request-failed') {
    return '附近格子暂时加载失败，移动或缩放时会自动重试。'
  }

  return undefined
}
