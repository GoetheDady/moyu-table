import { useCallback, useEffect, useRef, useState } from 'react'
import type { PerspectiveGrid } from '../../domain/cells/geometry'
import type { Camera, Cell, Coord, Selection } from '../../domain/cells/types'
import {
  beginWallPointer,
  moveWallPointer,
  releaseWallPointer,
  zoomWallAtPoint,
  type WallPointerSession,
} from './wallInteraction'
import {
  drawWallScene,
  resizeCanvasForWallScene,
} from './wallScene'
import {
  createWallSceneAnimationStore,
  syncWallSceneAnimationStore,
} from './wallSceneAnimation'

/** 无交互多少毫秒后暂停点点动画以节省电量。 */
const SPARKLE_IDLE_TIMEOUT = 30_000

/** GridCanvas 组件需要的外部状态和回调。 */
type GridCanvasProps = {
  cells: Cell[]
  grid: PerspectiveGrid
  hoveredCoord: Coord | null
  selection: Selection | null
  onCancelJumpAnimation: () => void
  onCameraChange: (camera: Camera) => void
  onDraftChange: (draft: string) => void
  onHoveredCoordChange: (coord: Coord | null) => void
  onSelectionChange: (selection: Selection | null) => void
  onZoomChange: (zoom: number) => void
}

/**
 * 渲染可拖拽、可缩放、可选择格子的透视网格画布。
 *
 * @param props 画布需要的格子、视图状态和交互回调。
 * @returns Canvas 元素。
 */
export function GridCanvas({
  cells,
  grid,
  hoveredCoord,
  selection,
  onCancelJumpAnimation,
  onCameraChange,
  onDraftChange,
  onHoveredCoordChange,
  onSelectionChange,
  onZoomChange,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const animationStoreRef = useRef(createWallSceneAnimationStore())
  const dragRef = useRef<WallPointerSession>({
    pointerId: -1,
    lastPoint: { x: 0, y: 0 },
    anchorWorld: { x: 0, y: 0 },
    totalDistance: 0,
    isDragging: false,
  })

  // 渲染状态 ref —— 每帧 render 同步写入，rAF 回调读取最新值，避免 effect 重启循环
  const cellsRef = useRef(cells)
  const gridRef = useRef(grid)
  const hoveredCoordRef = useRef(hoveredCoord)
  const selectionRef = useRef(selection)
  cellsRef.current = cells
  gridRef.current = grid
  hoveredCoordRef.current = hoveredCoord
  selectionRef.current = selection

  const lastInteractionRef = useRef(performance.now())
  const loopIdRef = useRef<number | null>(null)
  const [loopGeneration, setLoopGeneration] = useState(0)

  useEffect(() => {
    syncWallSceneAnimationStore(animationStoreRef.current, cells, performance.now())
  }, [cells])

  /**
   * 维护一个持久的 requestAnimationFrame 渲染循环。
   *
   * 循环只创建一次，每帧从 ref 读取最新的渲染状态，React 状态更新不会
   * 中断循环。循环在无动画需要时自动停止，在交互恢复后通过 loopGeneration
   * 重新唤醒。
   *
   * @returns 清理函数，副作用是取消未完成的动画帧。
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return
    contextRef.current = context

    /**
     * 绘制一帧墙面场景，并在仍有动画时继续请求下一帧。
     *
     * @param now 当前帧时间戳（来自 requestAnimationFrame 回调）。
     * @returns 无返回值，副作用是在 Canvas 上绘制当前画面。
     */
    const drawFrame = (now: number) => {
      const currentGrid = gridRef.current
      const dpr = window.devicePixelRatio || 1

      resizeCanvasForWallScene(canvas, context, currentGrid, dpr)

      const idleDuration = now - lastInteractionRef.current
      const sparkleActive = idleDuration < SPARKLE_IDLE_TIMEOUT

      const hasActiveAnimation = drawWallScene({
        context,
        cells: cellsRef.current,
        grid: currentGrid,
        hoveredCoord: hoveredCoordRef.current,
        selection: selectionRef.current,
        animationStore: animationStoreRef.current,
        now,
        sparkleActive,
      })

      if (hasActiveAnimation) {
        loopIdRef.current = requestAnimationFrame(drawFrame)
      } else {
        loopIdRef.current = null
      }
    }

    loopIdRef.current = requestAnimationFrame(drawFrame)

    return () => {
      if (loopIdRef.current !== null) {
        cancelAnimationFrame(loopIdRef.current)
        loopIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 循环只创建一次，渲染状态通过 ref 读取
  }, [loopGeneration])

  /**
   * 唤醒渲染循环——在交互恢复时调用。
   *
   * 重置空闲计时器。仅当循环已停止时才递增 loopGeneration 触发 effect 重启；
   * 循环活跃时不触发任何 React 状态更新，避免打断 rAF 节奏。
   */
  const wakeLoop = useCallback(() => {
    lastInteractionRef.current = performance.now()

    if (loopIdRef.current === null) {
      setLoopGeneration((generation) => generation + 1)
    }
  }, [])

  /**
   * 绑定滚轮缩放事件，并以鼠标位置为锚点更新相机。
   *
   * @returns 清理函数，副作用是在 Canvas 元素上添加和移除 wheel 事件监听器。
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    /**
     * 处理原生滚轮事件，并把缩放计算结果同步给上层状态。
     *
     * @param event 浏览器滚轮事件。
     * @returns 无返回值，副作用是阻止默认滚动、取消跳转动画并更新相机和缩放。
     */
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      onCancelJumpAnimation()

      wakeLoop()

      const nextView = zoomWallAtPoint(event.deltaY, { x: event.clientX, y: event.clientY }, gridRef.current)

      onZoomChange(nextView.zoom)
      onCameraChange(nextView.camera)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [gridRef, onCameraChange, onCancelJumpAnimation, onZoomChange, wakeLoop])

  /**
   * 处理指针按下，开始拖拽墙面或准备点击选中。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是捕获指针并初始化拖拽会话。
   */
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    onCancelJumpAnimation()

    wakeLoop()

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = beginWallPointer(event.pointerId, { x: event.clientX, y: event.clientY }, gridRef.current)
    onHoveredCoordChange(null)
  }

  /**
   * 处理指针移动，更新 hover、拖拽相机和必要的选中态清理。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是更新相机、hover 坐标和选中状态。
   */
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    wakeLoop()

    const point = { x: event.clientX, y: event.clientY }
    const isActivePointer = dragRef.current.pointerId === event.pointerId
    const session = isActivePointer
      ? dragRef.current
      : {
          ...dragRef.current,
          isDragging: false,
        }
    const move = moveWallPointer(session, point, gridRef.current, Boolean(selectionRef.current))

    onHoveredCoordChange(move.hoveredCoord)

    if (!isActivePointer) return

    dragRef.current = move.session

    if (move.camera) {
      onCameraChange(move.camera)
    }

    if (move.shouldClearSelection) {
      onSelectionChange(null)
      onDraftChange('')
    }
  }

  /**
   * 处理指针释放，将交互判定为拖拽结束或格子点击选择。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是可能切换选择态并清空草稿。
   */
  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return

    const release = releaseWallPointer(dragRef.current, { x: event.clientX, y: event.clientY }, gridRef.current, cellsRef.current)
    dragRef.current = release.session

    if (release.didDrag) return

    onSelectionChange(release.selection)
    onDraftChange('')
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-screen w-screen cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => onHoveredCoordChange(null)}
      onPointerUp={handlePointerUp}
    />
  )
}
