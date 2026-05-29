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
 * 在 Canvas 上按字符测量宽度并绘制自动换行文本。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param text 需要绘制的文本内容。
 * @param x 文本起始 x 坐标。
 * @param y 文本起始 y 坐标。
 * @param maxWidth 单行最大宽度。
 * @param lineHeight 行高。
 * @param maxLines 最多绘制行数。
 * @returns 无返回值，副作用是在 Canvas 上绘制文本。
 */
export function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    let line = ''

    for (const char of paragraph) {
      const nextLine = line + char
      if (context.measureText(nextLine).width > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = nextLine
      }

      if (lines.length >= maxLines) break
    }

    if (lines.length >= maxLines) break
    lines.push(line)
  }

  const visibleLines = lines.slice(0, maxLines)
  visibleLines.forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : ''
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight)
  })
}

/**
 * 在投影后的单元格局部坐标系中绘制自动换行文本。
 *
 * @param context Canvas 2D 绘图上下文。
 * @param text 需要绘制的文本内容。
 * @param box 投影文字盒子，包含局部坐标轴和尺寸。
 * @param paddingX 水平方向内边距。
 * @param paddingY 垂直方向内边距。
 * @param lineHeight 行高。
 * @param maxLines 最多绘制行数。
 * @returns 无返回值，副作用是临时修改 Canvas transform 并绘制文本；函数结束前会 restore。
 */
export function drawProjectedWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  box: ProjectedTextBox,
  paddingX: number,
  paddingY: number,
  lineHeight: number,
  maxLines: number,
) {
  const contentWidth = Math.max(1, box.width - paddingX * 2)

  context.save()
  context.transform(box.xAxis.x, box.xAxis.y, box.yAxis.x, box.yAxis.y, box.origin.x, box.origin.y)
  drawWrappedText(context, text, paddingX, paddingY, contentWidth, lineHeight, maxLines)
  context.restore()
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
 * 把单元格内容截断到适合预览绘制的长度。
 *
 * @param content 原始单元格文本。
 * @returns 如果文本过长，返回带省略号的短文本；否则返回原文。
 */
export function truncateForCell(content: string) {
  return content.length > 42 ? `${content.slice(0, 41)}...` : content
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
