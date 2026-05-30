import { useEffect, useRef } from 'react'
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
  createWallSceneAnimationStore,
  drawWallScene,
  resizeCanvasForWallScene,
  syncWallSceneAnimationStore,
} from './wallScene'

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
  const animationStoreRef = useRef(createWallSceneAnimationStore())
  const dragRef = useRef<WallPointerSession>({
    pointerId: -1,
    lastPoint: { x: 0, y: 0 },
    anchorWorld: { x: 0, y: 0 },
    totalDistance: 0,
    isDragging: false,
  })

  useEffect(() => {
    syncWallSceneAnimationStore(animationStoreRef.current, cells, performance.now())
  }, [cells])

  /**
   * 根据当前墙面场景状态重绘 Canvas。
   *
   * @returns 清理函数，副作用是调整 Canvas 尺寸、绘制当前帧并取消未完成的动画帧。
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    resizeCanvasForWallScene(canvas, context, grid, window.devicePixelRatio || 1)

    /**
     * 绘制一帧墙面场景，并在仍有入场动画时继续请求下一帧。
     *
     * @param now 当前帧时间戳。
     * @returns 无返回值，副作用是在 Canvas 上绘制当前画面。
     */
    const drawFrame = (now: number) => {
      const hasActiveIntroAnimation = drawWallScene({
        context,
        cells,
        grid,
        hoveredCoord,
        selection,
        animationStore: animationStoreRef.current,
        now,
      })

      if (hasActiveIntroAnimation) {
        animationFrameId = requestAnimationFrame(drawFrame)
      }
    }

    let animationFrameId: number | null = null
    drawFrame(performance.now())

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [cells, grid, hoveredCoord, selection])

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

      const nextView = zoomWallAtPoint(event.deltaY, { x: event.clientX, y: event.clientY }, grid)

      onZoomChange(nextView.zoom)
      onCameraChange(nextView.camera)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [grid, onCameraChange, onCancelJumpAnimation, onZoomChange])

  /**
   * 处理指针按下，开始拖拽墙面或准备点击选中。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是捕获指针并初始化拖拽会话。
   */
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    onCancelJumpAnimation()

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = beginWallPointer(event.pointerId, { x: event.clientX, y: event.clientY }, grid)
    onHoveredCoordChange(null)
  }

  /**
   * 处理指针移动，更新 hover、拖拽相机和必要的选中态清理。
   *
   * @param event React 指针事件。
   * @returns 无返回值，副作用是更新相机、hover 坐标和选中状态。
   */
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = { x: event.clientX, y: event.clientY }
    const isActivePointer = dragRef.current.pointerId === event.pointerId
    const session = isActivePointer
      ? dragRef.current
      : {
          ...dragRef.current,
          isDragging: false,
        }
    const move = moveWallPointer(session, point, grid, Boolean(selection))

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

    const release = releaseWallPointer(dragRef.current, { x: event.clientX, y: event.clientY }, grid, cells)
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
