import { useEffect, useRef, useState } from 'react'
import type { CellClient } from '../../data/cellClient'
import type { Viewport } from '../../domain/cells/geometry'
import type { Camera, Cell } from '../../domain/cells/types'
import { getMinimapCellRange, shouldRefreshMinimap } from '../../domain/cells/minimapProjection'

/** 小地图数据刷新防抖时间（毫秒）。比主视口防抖更长，因为小地图不随每帧拖拽更新。 */
const MINIMAP_FETCH_DEBOUNCE_MS = 500

/**
 * 获取小地图覆盖范围内的格子数据。
 *
 * 独立于主视口数据流：范围为主视口的 6 倍，仅在相机移动超过阈值时
 * 重新拉取，配合 500ms 防抖减少不必要的请求。
 *
 * @param camera 当前相机位置。
 * @param zoom 当前缩放倍数。
 * @param viewport 当前视口尺寸。
 * @param cellClient 格子数据客户端。
 * @returns 小地图范围内的格子列表（仅用作位置标记，不含内容渲染）。
 */
export function useMinimapCells(
  camera: Camera,
  zoom: number,
  viewport: Viewport,
  cellClient: CellClient,
): Cell[] {
  const [cells, setCells] = useState<Cell[]>([])
  const lastFetchCameraRef = useRef<Camera | null>(null)

  useEffect(() => {
    // 相机移动未超过阈值时不刷新
    if (
      lastFetchCameraRef.current &&
      !shouldRefreshMinimap(lastFetchCameraRef.current, camera, zoom)
    ) {
      return
    }

    const controller = new AbortController()
    const range = getMinimapCellRange(camera, zoom, viewport)

    const timeoutId = window.setTimeout(() => {
      void cellClient
        .listCellsInRange(range, { signal: controller.signal })
        .then((result) => {
          if (result.status === 'loaded') {
            setCells(result.cells)
            lastFetchCameraRef.current = camera
          }
        })
    }, MINIMAP_FETCH_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [camera, zoom, viewport, cellClient])

  return cells
}
