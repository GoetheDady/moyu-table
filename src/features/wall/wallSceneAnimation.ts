import type { Cell } from '../../domain/cells/types'
import { clamp } from '../../domain/cells/geometry'

/** 表示墙面场景中格子入场动画需要跨帧保留的状态。 */
export type WallSceneAnimationStore = {
  cellIntroStartedAt: Map<string, number>
  previousCellIds: Set<string>
}

const CELL_INTRO_ANIMATION_MS = 520

/**
 * 创建墙面场景动画状态容器。
 *
 * @returns 空的动画状态容器，用于记录新出现格子的入场动画起点。
 */
export function createWallSceneAnimationStore(): WallSceneAnimationStore {
  return {
    cellIntroStartedAt: new Map<string, number>(),
    previousCellIds: new Set<string>(),
  }
}

/**
 * 根据最新格子列表同步入场动画状态。
 *
 * @param store 墙面场景动画状态容器。
 * @param cells 当前可见格子列表。
 * @param now 当前时间戳。
 * @returns 无返回值，副作用是记录新格子的入场动画起点并清理已消失格子的动画状态。
 */
export function syncWallSceneAnimationStore(store: WallSceneAnimationStore, cells: Cell[], now: number): void {
  const nextCellIds = new Set(cells.map((cell) => cell.id))

  for (const cell of cells) {
    if (!store.previousCellIds.has(cell.id)) {
      store.cellIntroStartedAt.set(cell.id, now)
    }
  }

  for (const cellId of store.cellIntroStartedAt.keys()) {
    if (!nextCellIds.has(cellId)) {
      store.cellIntroStartedAt.delete(cellId)
    }
  }

  store.previousCellIds = nextCellIds
}

/**
 * 获取指定格子的入场动画进度。
 *
 * @param store 墙面场景动画状态容器。
 * @param cellId 格子 id。
 * @param now 当前帧时间戳。
 * @returns 缓动后的动画进度，范围为 0 到 1。
 */
export function getCellIntroProgress(store: WallSceneAnimationStore, cellId: string, now: number): number {
  const startedAt = store.cellIntroStartedAt.get(cellId)
  if (startedAt === undefined) return 1

  const progress = clamp((now - startedAt) / CELL_INTRO_ANIMATION_MS, 0, 1)

  if (progress >= 1) {
    store.cellIntroStartedAt.delete(cellId)
  }

  return easeOutCubic(progress)
}

/**
 * 计算缓出的三次方动画进度。
 */
function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3
}
