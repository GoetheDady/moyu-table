import { MAX_ZOOM, MIN_ZOOM } from './constants.js'
import { clamp, coordKey } from './geometry.js'
import type { PerspectiveGrid } from './geometry.js'
import type { Camera, Cell, Coord, Selection } from './types.js'

type Point = {
  x: number
  y: number
}

/** 记录一次墙面指针交互从按下到释放之间的状态。 */
export type WallPointerSession = {
  pointerId: number
  lastPoint: Point
  anchorWorld: Point
  totalDistance: number
  isDragging: boolean
}

/** 表示指针移动后需要同步给界面的相机、悬停和选择状态。 */
export type WallPointerMove = {
  camera: Camera
  hoveredSelection: Selection['coord']
  shouldClearSelection: boolean
  session: WallPointerSession
}

/** 小于该距离的按下和释放会被视为点击，而不是拖拽。 */
const CLICK_DISTANCE = 8

/** 选中态在拖拽超过该距离后会被清空，避免拖动画布时误保留编辑浮层。 */
const CLEAR_SELECTION_DISTANCE = 12

/**
 * 开始一次墙面指针交互。
 *
 * @param pointerId 浏览器分配的指针 id。
 * @param point 指针按下时的屏幕坐标。
 * @param grid 当前透视网格工具对象。
 * @returns 新的指针交互会话，包含锚定世界坐标。
 */
export function beginWallPointer(pointerId: number, point: Point, grid: PerspectiveGrid): WallPointerSession {
  return {
    pointerId,
    lastPoint: point,
    anchorWorld: grid.screenToWorld(point),
    totalDistance: 0,
    isDragging: true,
  }
}

/**
 * 计算拖动画布时的下一帧交互状态。
 *
 * @param session 当前指针交互会话。
 * @param point 当前指针屏幕坐标。
 * @param grid 当前透视网格工具对象。
 * @param hasSelection 当前是否存在选中态。
 * @returns 新相机位置、hover 坐标、是否清空选中态，以及更新后的会话。
 */
export function moveWallPointer(
  session: WallPointerSession,
  point: Point,
  grid: PerspectiveGrid,
  hasSelection: boolean,
): WallPointerMove {
  const distance = Math.abs(point.x - session.lastPoint.x) + Math.abs(point.y - session.lastPoint.y)
  const nextSession = {
    ...session,
    lastPoint: point,
    totalDistance: session.totalDistance + distance,
  }

  return {
    camera: grid.cameraForAnchor(nextSession.anchorWorld, point),
    hoveredSelection: grid.screenToCell(point),
    shouldClearSelection: hasSelection && nextSession.totalDistance > CLEAR_SELECTION_DISTANCE,
    session: nextSession,
  }
}

/**
 * 计算指针悬停命中的网格坐标。
 *
 * @param point 当前指针屏幕坐标。
 * @param grid 当前透视网格工具对象。
 * @param isDragging 当前是否正在拖拽。
 * @returns 非拖拽时返回命中的单元格坐标；拖拽时返回 null 以抑制 hover。
 */
export function hoverWallAtPoint(point: Point, grid: PerspectiveGrid, isDragging: boolean): Coord | null {
  if (isDragging) {
    return null
  }

  return grid.screenToCell(point)
}

/**
 * 结束一次墙面指针交互，并判断结果是拖拽还是点击选择。
 *
 * @param session 当前指针交互会话。
 * @param point 指针释放时的屏幕坐标。
 * @param grid 当前透视网格工具对象。
 * @param cells 当前已有内容的单元格列表。
 * @returns 如果是拖拽，返回 didDrag true；如果是点击，返回要进入的 read 或 edit 选择态。
 */
export function releaseWallPointer(
  session: WallPointerSession,
  point: Point,
  grid: PerspectiveGrid,
  cells: Cell[],
): { didDrag: true; session: WallPointerSession } | { didDrag: false; session: WallPointerSession; selection: Selection } {
  const nextSession = {
    ...session,
    isDragging: false,
    pointerId: -1,
  }

  if (session.totalDistance > CLICK_DISTANCE) {
    return { didDrag: true, session: nextSession }
  }

  const coord = grid.screenToCell(point)
  const cell = cells.find((candidate) => coordKey(candidate) === coordKey(coord))

  if (cell) {
    return { didDrag: false, session: nextSession, selection: { mode: 'read', coord, cell } }
  }

  return { didDrag: false, session: nextSession, selection: { mode: 'edit', coord } }
}

/**
 * 以指针所在世界点为锚点计算滚轮缩放后的视图。
 *
 * @param deltaY 滚轮纵向变化量。
 * @param point 指针所在屏幕坐标。
 * @param grid 当前透视网格工具对象。
 * @returns 新缩放倍数和新相机位置。
 */
export function zoomWallAtPoint(deltaY: number, point: Point, grid: PerspectiveGrid) {
  const zoom = clamp(grid.zoom * Math.exp(-deltaY * 0.001), MIN_ZOOM, MAX_ZOOM)
  const worldAtPointer = grid.screenToWorld(point)

  return {
    zoom,
    camera: grid.cameraForAnchor(worldAtPointer, point, zoom),
  }
}
