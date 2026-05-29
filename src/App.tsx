import { useEffect, useMemo, useRef, useState } from 'react'
import { FloatingPanels } from './components/FloatingPanels.js'
import { GridCanvas } from './components/GridCanvas.js'
import { JumpDock } from './components/JumpDock.js'
import { initialCells } from './data/demoCells.js'
import { authorCell } from './lib/cellAuthoring.js'
import { JUMP_ANIMATION_MS } from './lib/constants.js'
import {
  cameraForCellCenter,
  clamp,
  createPerspectiveGrid,
  easeInOutCubic,
} from './lib/geometry.js'
import type { Camera, Cell, CellRect, Coord, Selection } from './lib/types.js'

/**
 * 渲染 moyu-table 的主应用，并维护网格内容、相机、缩放和选中态。
 *
 * @returns 应用的根 React 节点。
 */
function App() {
  const jumpAnimationRef = useRef<number | null>(null)

  const [cells, setCells] = useState<Cell[]>(initialCells)
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 32 })
  const [zoom, setZoom] = useState(1)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
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
  const handleSubmit = () => {
    if (!selection || selection.mode !== 'edit') return

    const result = authorCell(cells, selection.coord, draft)
    if (result.status !== 'created') return

    setCells((currentCells) => {
      const currentResult = authorCell(currentCells, selection.coord, draft)
      if (currentResult.status !== 'created') {
        return currentCells
      }

      return [...currentCells, currentResult.cell]
    })
    setSelection({ mode: 'read', coord: selection.coord, cell: result.cell })
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
  let left = rect.right + gap
  let top = rect.top + 2

  if (left + width > window.innerWidth - 16) {
    left = rect.left - width - gap
  }

  if (top + height > window.innerHeight - 16) {
    top = window.innerHeight - height - 16
  }

  return {
    left: `${clamp(left, 16, window.innerWidth - width - 16)}px`,
    top: `${clamp(top, 16, window.innerHeight - height - 16)}px`,
    width: `${width}px`,
  }
}

export default App
