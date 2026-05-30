import type { Coord } from '../../domain/cells/types'

type MouseCoordDisplayProps = {
  coord: Coord | null
}

/**
 * 在屏幕右上角显示鼠标当前所在的 cell 坐标。
 *
 * 当 coord 为 null 时不渲染任何内容，由父组件控制显示时机。
 *
 * @param props 包含当前 hover 的 cell 坐标，可为 null。
 * @returns 坐标显示面板或 null。
 */
export function MouseCoordDisplay({ coord }: MouseCoordDisplayProps) {
  if (!coord) return null

  const surface =
    'border border-moyu-border-soft bg-moyu-panel-soft bg-linear-to-b from-moyu-panel-soft-top to-moyu-panel-soft-bottom shadow-moyu-dock backdrop-blur-2xl'

  return (
    <div
      aria-label="鼠标坐标"
      className={`absolute top-[18px] right-[18px] z-30 rounded-lg px-3 py-1.5 ${surface}`}
    >
      <span className="font-mono text-[13px] font-semibold leading-none text-[#e4f5edd6]">
        x: {coord.x}  y: {coord.y}
      </span>
    </div>
  )
}
