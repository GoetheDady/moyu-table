import type { CellClient, ListClientCellsResult } from '../../data/cellClient'
import type { PerspectiveGrid } from '../../domain/cells/geometry'
import type { Cell } from '../../domain/cells/types'

/** 表示一次可见格子读取执行所需的最小依赖。 */
export type VisibleCellLoadRunnerInput = {
  grid: PerspectiveGrid
  cellClient: CellClient
  signal: AbortSignal
  onCellsLoaded: (cells: Cell[]) => void
  onLoadErrorChange: (error: string | null) => void
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
