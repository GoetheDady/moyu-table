import { describe, expect, test } from 'vitest'
import { createWallSceneAnimationStore, syncWallSceneAnimationStore } from '../src/features/wall/wallSceneAnimation'
import type { Cell } from '../src/domain/cells/types'

const firstCell: Cell = {
  id: 'first-cell',
  x: 0,
  y: 0,
  blocks: [{ id: 'first-cell:block', type: 'text', content: '第一格' }],
  createdAt: '2026-05-29T10:00:00.000Z',
  tone: 'mint',
}

const secondCell: Cell = {
  id: 'second-cell',
  x: 1,
  y: 0,
  blocks: [{ id: 'second-cell:block', type: 'text', content: '第二格' }],
  createdAt: '2026-05-29T11:00:00.000Z',
  tone: 'coral',
}

describe('Wall scene', () => {
  /**
   * 验证墙面场景会只为新出现的格子记录入场动画，并清理消失格子的动画状态。
   *
   * 入场动画状态集中在 wallScene Module，GridCanvas 只负责把 Canvas 和 React 生命周期接起来。
   */
  test('同步格子入场动画状态', () => {
    const store = createWallSceneAnimationStore()

    syncWallSceneAnimationStore(store, [firstCell], 1000)
    expect(store.cellIntroStartedAt.get(firstCell.id)).toBe(1000)

    syncWallSceneAnimationStore(store, [firstCell, secondCell], 1400)
    expect(store.cellIntroStartedAt.get(firstCell.id)).toBe(1000)
    expect(store.cellIntroStartedAt.get(secondCell.id)).toBe(1400)

    syncWallSceneAnimationStore(store, [secondCell], 1800)
    expect(store.cellIntroStartedAt.has(firstCell.id)).toBe(false)
    expect(store.cellIntroStartedAt.get(secondCell.id)).toBe(1400)
  })
})
