/** 表示二维平面中的一个点。 */
type Point = {
  x: number
  y: number
}

/**
 * 表示文字在投影单元格内的局部绘制坐标系。
 *
 * xAxis 和 yAxis 是单位方向向量，用来把普通文字绘制变换到透视四边形中。
 */
export type ProjectedTextBox = {
  origin: Point
  xAxis: Point
  yAxis: Point
  width: number
  height: number
}

/**
 * 根据单元格四个屏幕角点计算文字绘制盒子。
 *
 * @param points 单元格四个角点，按左上、右上、右下、左下顺序传入。
 * @returns 可用于 Canvas transform 的投影文字盒子。
 */
export function getProjectedTextBox(points: Point[]): ProjectedTextBox {
  const [topLeft, topRight, bottomRight, bottomLeft] = points
  const topWidth = distance(topLeft, topRight)
  const bottomWidth = distance(bottomLeft, bottomRight)
  const leftHeight = distance(topLeft, bottomLeft)
  const rightHeight = distance(topRight, bottomRight)
  const width = Math.max(1, (topWidth + bottomWidth) / 2)
  const height = Math.max(1, (leftHeight + rightHeight) / 2)

  return {
    origin: topLeft,
    xAxis: {
      x: (topRight.x - topLeft.x) / width,
      y: (topRight.y - topLeft.y) / width,
    },
    yAxis: {
      x: (bottomLeft.x - topLeft.x) / height,
      y: (bottomLeft.y - topLeft.y) / height,
    },
    width,
    height,
  }
}

/**
 * 把 ISO 时间字符串格式化为中文短日期时间。
 *
 * @param value 可被 Date 解析的时间字符串。
 * @returns 形如月日和时分的本地化时间文本。
 */
export function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

/**
 * 计算两个点之间的欧氏距离。
 *
 * @param start 起点。
 * @param end 终点。
 * @returns 两点之间的直线距离。
 */
const distance = (start: Point, end: Point) => Math.hypot(end.x - start.x, end.y - start.y)
