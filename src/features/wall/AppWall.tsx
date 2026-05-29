'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { authorCell } from '../../domain/cells/cellAuthoring'
import { JUMP_ANIMATION_MS } from '../../domain/cells/constants'
import {
  cameraForCellCenter,
  clamp,
  createPerspectiveGrid,
  easeInOutCubic,
} from '../../domain/cells/geometry'
import type { Camera, Cell, CellRect, Coord, Selection } from '../../domain/cells/types'
import { FloatingPanels } from './FloatingPanels'
import { GridCanvas } from './GridCanvas'
import { JumpDock } from './JumpDock'

const initialViewport = { width: 1280, height: 720 }
const CELL_FETCH_DEBOUNCE_MS = 220

type CellsResponse = {
  cells: Cell[]
}

type CreateCellResponse = {
  cell: Cell
}

/**
 * 渲染 moyu-table 的主应用，并维护网格内容、相机、缩放和选中态。
 *
 * @returns 应用的根 React 节点。
 */
function AppWall() {
  const jumpAnimationRef = useRef<number | null>(null)

  const [cells, setCells] = useState<Cell[]>([])
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 32 })
  const [zoom, setZoom] = useState(1)
  const [viewport, setViewport] = useState(initialViewport)
  const [hoveredCoord, setHoveredCoord] = useState<Coord | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [draft, setDraft] = useState('')
  const [isJumpOpen, setIsJumpOpen] = useState(false)
  const [jumpX, setJumpX] = useState('0')
  const [jumpY, setJumpY] = useState('0')

  const grid = useMemo(() => createPerspectiveGrid({ camera, zoom, viewport }), [camera, zoom, viewport])

  /**
   * 取消当前正在执行的坐标跳转动画。
   *
   * @returns 无返回值，副作用是取消 requestAnimationFrame 并清空动画引用。
   */
  const cancelJumpAnimation = () => {
    if (jumpAnimationRef.current !== null) {
      cancelAnimationFrame(jumpAnimationRef.current)
      jumpAnimationRef.current = null
    }
  }

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    onResize()
    window.addEventListener('resize', onResize)

    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => cancelJumpAnimation, [])

  useEffect(() => {
    const controller = new AbortController()
    const range = grid.visibleRange()

    /**
     * 从后端读取当前可见范围内的格子。
     *
     * @returns Promise，无显式返回值；副作用是用接口数据替换当前画布格子。
     */
    const loadVisibleCells = async () => {
      const params = new URLSearchParams({
        minX: String(range.startX),
        maxX: String(range.endX),
        minY: String(range.startY),
        maxY: String(range.endY),
      })
      try {
        const response = await fetch(`/api/cells?${params.toString()}`, { signal: controller.signal })

        if (!response.ok) return

        const result = (await response.json()) as CellsResponse
        setCells(result.cells)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return

        throw error
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadVisibleCells()
    }, CELL_FETCH_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [grid])

  /**
   * 平滑移动相机到目标位置。
   *
   * @param targetCamera 目标相机坐标。
   * @returns 无返回值，副作用是启动逐帧动画并持续更新 camera 状态。
   */
  const animateCameraTo = (targetCamera: Camera) => {
    cancelJumpAnimation()

    const startCamera = camera
    const startedAt = performance.now()

    const step = (now: number) => {
      const progress = clamp((now - startedAt) / JUMP_ANIMATION_MS, 0, 1)
      const easedProgress = easeInOutCubic(progress)

      setCamera({
        x: startCamera.x + (targetCamera.x - startCamera.x) * easedProgress,
        y: startCamera.y + (targetCamera.y - startCamera.y) * easedProgress,
      })

      if (progress < 1) {
        jumpAnimationRef.current = requestAnimationFrame(step)
      } else {
        jumpAnimationRef.current = null
      }
    }

    jumpAnimationRef.current = requestAnimationFrame(step)
  }

  /**
   * 处理坐标跳转表单提交。
   *
   * @param event React 表单提交事件。
   * @returns 无返回值，副作用是清空编辑状态并启动相机跳转动画。
   */
  const handleJumpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const x = Number(jumpX)
    const y = Number(jumpY)

    if (!Number.isInteger(x) || !Number.isInteger(y)) return

    setSelection(null)
    setDraft('')
    setHoveredCoord({ x, y })
    animateCameraTo(cameraForCellCenter({ x, y }))
  }

  /**
   * 提交当前编辑草稿并写入选中的空单元格。
   *
   * @returns 无返回值，副作用是可能新增单元格、切换到阅读态并清空草稿。
   */
  const handleSubmit = async () => {
    if (!selection || selection.mode !== 'edit') return

    const result = authorCell(cells, selection.coord, draft)
    if (result.status !== 'created') return

    const response = await fetch('/api/cells', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: selection.coord.x,
        y: selection.coord.y,
        type: 'THOUGHT',
        content: draft,
      }),
    })

    if (!response.ok) return

    const created = ((await response.json()) as CreateCellResponse).cell

    setCells((currentCells) => {
      if (currentCells.some((cell) => cell.x === created.x && cell.y === created.y)) {
        return currentCells
      }

      return [...currentCells, created]
    })
    setSelection({ mode: 'read', coord: selection.coord, cell: created })
    setDraft('')
  }

  const panelStyle = selection
    ? getPanelStyle(
        grid.cellRect(selection.coord),
        selection.mode === 'edit' ? 326 : 292,
        selection.mode === 'edit' ? 220 : 184,
      )
    : undefined

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-moyu-bg text-moyu-text"
      aria-label="moyuTable infinite collaborative wall"
    >
      <GridCanvas
        cells={cells}
        grid={grid}
        hoveredCoord={hoveredCoord}
        selection={selection}
        onCancelJumpAnimation={cancelJumpAnimation}
        onCameraChange={setCamera}
        onDraftChange={setDraft}
        onHoveredCoordChange={setHoveredCoord}
        onSelectionChange={setSelection}
        onZoomChange={setZoom}
      />

      <JumpDock
        isOpen={isJumpOpen}
        jumpX={jumpX}
        jumpY={jumpY}
        onJumpXChange={setJumpX}
        onJumpYChange={setJumpY}
        onOpenChange={setIsJumpOpen}
        onSubmit={handleJumpSubmit}
      />

      <FloatingPanels
        draft={draft}
        panelStyle={panelStyle}
        selection={selection}
        onCancelEdit={() => {
          setSelection(null)
          setDraft('')
        }}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
      />
    </main>
  )
}

/**
 * 计算浮层面板相对单元格投影矩形的屏幕位置。
 *
 * @param rect 当前选中单元格的屏幕投影矩形。
 * @param width 面板宽度。
 * @param height 面板高度。
 * @returns 可直接传给 React style 的 left、top 和 width。
 */
function getPanelStyle(rect: CellRect, width: number, height: number) {
  const gap = 18
  const viewportWidth = typeof window === 'undefined' ? initialViewport.width : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? initialViewport.height : window.innerHeight
  let left = rect.right + gap
  let top = rect.top + 2

  if (left + width > viewportWidth - 16) {
    left = rect.left - width - gap
  }

  if (top + height > viewportHeight - 16) {
    top = viewportHeight - height - 16
  }

  return {
    left: `${clamp(left, 16, viewportWidth - width - 16)}px`,
    top: `${clamp(top, 16, viewportHeight - height - 16)}px`,
    width: `${width}px`,
  }
}

export default AppWall
