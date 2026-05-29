/** 单元格在世界坐标系中的边长，单位是虚拟像素。 */
export const CELL_SIZE = 96

/** 允许缩放的最小倍数，防止网格缩得过小难以操作。 */
export const MIN_ZOOM = 0.5

/** 允许缩放的最大倍数，防止透视投影被放大到失真。 */
export const MAX_ZOOM = 2

/** 单个单元格可写入的最大字符数。 */
export const CONTENT_LIMIT = 200

/** 透视缩放强度，数值越大远近变化越明显。 */
export const PERSPECTIVE_STRENGTH = 1 / 1400

/** y 轴投影压缩比例，用来形成斜视墙面的空间感。 */
export const PERSPECTIVE_Y_SCALE = 0.82

/** 可绘制单元格的最大投影宽度，用来过滤异常透视结果。 */
export const MAX_CELL_DRAW_WIDTH = 420

/** 可绘制单元格的最大投影高度，用来过滤异常透视结果。 */
export const MAX_CELL_DRAW_HEIGHT = 260

/** 坐标跳转动画时长，单位是毫秒。 */
export const JUMP_ANIMATION_MS = 620
