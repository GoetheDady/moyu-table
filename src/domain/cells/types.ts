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
 * 表示单元格内容块的类型。
 *
 * 第一版只创建 text 类型，但类型集合为后续问题、图片、艺术字和画图预留。
 */
export type CellBlockType = 'text' | 'question' | 'image' | 'artText' | 'drawing'

/**
 * 表示单元格里的一个内容块。
 *
 * title 用于封面标题和未来搜索；content 用于保存文字正文或内容说明。
 */
export type CellBlock = {
  id: string
  type: CellBlockType
  title?: string
  content?: string
}

/**
 * 表示未点开单元格时使用的封面预览。
 *
 * 第一版以前端 template 动态生成；imageUrl 为未来图片、画图快照或后端封面预留。
 */
export type CellPreview = {
  source: 'template' | 'image' | 'drawingSnapshot' | 'aiGenerated'
  template: CellBlockType
  title: string
  subtitle?: string
  label: string
  imageUrl?: string
}

/**
 * 表示已经写入内容的网格单元格。
 *
 * createdAt 使用 ISO 时间字符串，方便序列化和后续跨时区展示。
 */
export type Cell = Coord & {
  id: string
  blocks: CellBlock[]
  previewOverride?: CellPreview
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
