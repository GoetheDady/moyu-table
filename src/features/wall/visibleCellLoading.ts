import { useCallback, useEffect, useState } from 'react'
import type { CellClient } from '../../data/cellClient'
import type { PerspectiveGrid } from '../../domain/cells/geometry'
import type { Cell } from '../../domain/cells/types'
import {
  getVisibleCellLoadError,
  mergeVisibleCells,
  runVisibleCellLoad,
} from './visibleCellLoader'

/** 视口变化后延迟读取格子的时间，用来合并连续拖拽或缩放产生的请求。 */
export const CELL_FETCH_DEBOUNCE_MS = 220

/** 表示无限格子墙当前可见格子的加载状态和写入合并入口。 */
export type VisibleCellLoadingState = {
  cells: Cell[]
  loadError: string | null
  rememberCreatedCell: (cell: Cell) => void
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
