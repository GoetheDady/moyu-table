'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createCellClient, type CreateClientCellResult } from '../../data/cellClient'
import { checkCellAuthoring, type CellAuthoringCheckResult } from '../../domain/cells/cellAuthoring'
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

/**
 * 渲染 moyu-table 的主应用，并维护网格内容、相机、缩放和选中态。
 *
 * @returns 应用的根 React 节点。
 */
function AppWall() {
  const jumpAnimationRef = useRef<number | null>(null)

  const cellClient = useMemo(() => createCellClient(), [])
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [authoringError, setAuthoringError] = useState<string | null>(null)
  const [isSubmittingCell, setIsSubmittingCell] = useState(false)

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
    const range = grid.visibleCellRange()

    /**
     * 从后端读取当前可见范围内的格子。
     *
     * @returns Promise，无显式返回值；副作用是用接口数据替换当前画布格子。
     */
    const loadVisibleCells = async () => {
      const result = await cellClient.listCellsInRange(range, { signal: controller.signal })

      if (result.status === 'loaded') {
        setCells(result.cells)
        setLoadError(null)
      }

      if (result.status === 'request-failed') {
        setLoadError('附近格子暂时加载失败，移动或缩放时会自动重试。')
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadVisibleCells()
    }, CELL_FETCH_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [cellClient, grid])

  /**
   * 更新用户草稿，并清理上一轮写入失败提示。
   *
   * @param nextDraft 下一份草稿文本。
   * @returns 无返回值，副作用是更新编辑状态。
   */
  const handleDraftChange = (nextDraft: string) => {
    setDraft(nextDraft)
    setAuthoringError(null)
  }

  /**
   * 更新当前选中态，并清理与旧选中格子相关的错误提示。
   *
   * @param nextSelection 下一份选中态，null 表示没有选中任何格子。
   * @returns 无返回值，副作用是更新选择状态。
   */
  const handleSelectionChange = (nextSelection: Selection | null) => {
    setSelection(nextSelection)
    setAuthoringError(null)
  }

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
    setAuthoringError(null)
    setHoveredCoord({ x, y })
    animateCameraTo(cameraForCellCenter({ x, y }))
  }

  /**
   * 提交当前编辑草稿并写入选中的空单元格。
   *
   * @returns 无返回值，副作用是可能新增单元格、切换到阅读态并清空草稿。
   */
  const handleSubmit = async () => {
    if (!selection || selection.mode !== 'edit' || isSubmittingCell) return

    const checkResult = checkCellAuthoring(cells, selection.coord, draft)
    if (checkResult.status !== 'ready') {
      setAuthoringError(getAuthoringFailureMessage(checkResult.status))
      return
    }

    setIsSubmittingCell(true)
    setAuthoringError(null)

    const createResult = await cellClient.createCell({
      x: selection.coord.x,
      y: selection.coord.y,
      type: 'THOUGHT',
      content: draft,
    })

    setIsSubmittingCell(false)

    if (createResult.status !== 'created') {
      setAuthoringError(getCreateCellFailureMessage(createResult))
      return
    }

    const created = createResult.cell

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
        selection.mode === 'edit' ? 248 : 184,
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
        onDraftChange={handleDraftChange}
        onHoveredCoordChange={setHoveredCoord}
        onSelectionChange={handleSelectionChange}
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

      {loadError ? (
        <div
          role="status"
          className="absolute top-[18px] right-[18px] z-30 max-w-[min(360px,calc(100vw-36px))] rounded-lg border border-[#f0ca7355] bg-[#2b2113cc] px-3.5 py-2.5 text-[13px] font-semibold leading-[1.45] text-[#ffe2a3] shadow-moyu-dock backdrop-blur-2xl"
        >
          {loadError}
        </div>
      ) : null}

      <FloatingPanels
        authoringError={authoringError}
        draft={draft}
        isSubmitting={isSubmittingCell}
        panelStyle={panelStyle}
        selection={selection}
        onCancelEdit={() => {
          setSelection(null)
          setDraft('')
          setAuthoringError(null)
        }}
        onDraftChange={handleDraftChange}
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

/**
 * 将前端写入前置检查结果转换为用户可读提示。
 *
 * @param status 前置检查失败状态。
 * @returns 可以显示在编辑面板里的错误提示。
 */
function getAuthoringFailureMessage(status: Exclude<CellAuthoringCheckResult['status'], 'ready'>): string {
  if (status === 'empty-draft') {
    return '先写点内容再锁定这个格子。'
  }

  if (status === 'too-long') {
    return '内容超过字数上限，删短一点再试。'
  }

  return '这个格子已经有内容了，换一个空格子试试。'
}

/**
 * 将后端写入结果转换为用户可读提示。
 *
 * @param result 创建格子失败结果。
 * @returns 可以显示在编辑面板里的错误提示。
 */
function getCreateCellFailureMessage(result: Exclude<CreateClientCellResult, { status: 'created' }>): string {
  if (result.status === 'invalid-content') {
    return '内容为空或超过上限，调整后再写入。'
  }

  if (result.status === 'occupied') {
    return '这个格子刚刚被占用了，换一个空格子试试。'
  }

  return '写入失败，请稍后再试。'
}
