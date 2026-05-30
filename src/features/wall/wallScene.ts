import type { PerspectiveGrid } from '../../domain/cells/geometry'
import type { Cell, Coord, Selection } from '../../domain/cells/types'
import { drawOccupiedCell, drawFocusedCell } from './wallCellRenderer'
import { drawBackground, drawGrid, drawSparkles } from './wallBackgroundLayer'
import {
  getCellIntroProgress,
  type WallSceneAnimationStore,
} from './wallSceneAnimation'

/** 表示绘制一帧墙面场景所需的全部输入。 */
export type WallSceneFrame = {
  context: CanvasRenderingContext2D
  cells: Cell[]
  grid: PerspectiveGrid
  hoveredCoord: Coord | null
  selection: Selection | null
  animationStore: WallSceneAnimationStore
  now: number
  sparkleActive: boolean
}

/**
 * 按当前网格视口和设备像素比调整 Canvas 尺寸。
 */
export function resizeCanvasForWallScene(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  grid: PerspectiveGrid,
  devicePixelRatio: number,
): void {
  canvas.width = Math.round(grid.viewport.width * devicePixelRatio)
  canvas.height = Math.round(grid.viewport.height * devicePixelRatio)
  canvas.style.width = `${grid.viewport.width}px`
  canvas.style.height = `${grid.viewport.height}px`

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
}

/**
 * 绘制一帧完整的无限格子墙场景——编排背景、格子、焦点渲染。
 *
 * @returns 如果仍有格子入场动画需要继续绘制下一帧，返回 true。
 */
export function drawWallScene(frame: WallSceneFrame): boolean {
  const { context, cells, grid, hoveredCoord, selection, animationStore, now } = frame

  context.clearRect(0, 0, grid.viewport.width, grid.viewport.height)
  drawBackground(context, grid)
  drawGrid(context, grid)
  drawSparkles(context, grid, now)

  let hasActiveIntroAnimation = false

  for (const cell of cells) {
    const introProgress = getCellIntroProgress(animationStore, cell.id, now)
    if (introProgress < 1) {
      hasActiveIntroAnimation = true
    }

    drawOccupiedCell(context, grid, cell, introProgress)
  }

  if (hoveredCoord && !cells.some((cell) => cell.x === hoveredCoord.x && cell.y === hoveredCoord.y)) {
    drawFocusedCell(context, grid, hoveredCoord, 'hover')
  }

  if (selection?.mode === 'edit') {
    drawFocusedCell(context, grid, selection.coord, 'active')
  }

  return hasActiveIntroAnimation || frame.sparkleActive
}
