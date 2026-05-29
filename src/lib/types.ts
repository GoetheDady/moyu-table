/**
 * 表示网格中的整数坐标。
 *
 * x 向右递增，y 按项目约定向上递增。
 */
export type Coord = {
  x: number
  y: number
}

/**
 * 表示单元格可使用的视觉色调名称。
 *
 * 色调的具体颜色值在 `toneMap` 中统一维护。
 */
export type CellTone = 'mint' | 'amber' | 'cyan' | 'coral'

/**
 * 表示已经写入内容的网格单元格。
 *
 * createdAt 使用 ISO 时间字符串，方便序列化和后续跨时区展示。
 */
export type Cell = Coord & {
  content: string
  createdAt: string
  tone: CellTone
}

/**
 * 表示画布相机在世界坐标系中的观察中心。
 *
 * 相机坐标用于把世界坐标转换成屏幕坐标。
 */
export type Camera = {
  x: number
  y: number
}

/**
 * 表示单元格投影到屏幕后的矩形和四个角点。
 *
 * points 按左上、右上、右下、左下顺序保存，用于绘制透视四边形。
 */
export type CellRect = {
  left: number
  top: number
  right: number
  bottom: number
  size: number
  width: number
  height: number
  points: { x: number; y: number }[]
}

/**
 * 表示当前用户选中的单元格状态。
 *
 * edit 表示空格子正在编辑；read 表示已有内容的格子正在查看。
 */
export type Selection =
  | { mode: 'edit'; coord: Coord }
  | { mode: 'read'; coord: Coord; cell: Cell }
