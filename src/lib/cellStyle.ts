import type { CellTone } from './types.js'

/**
 * 单元格色调到实际绘制颜色的映射表。
 *
 * fill、stroke、text、glow 分别用于背景、描边、文字和投影光晕。
 */
export const toneMap: Record<CellTone, { fill: string; stroke: string; text: string; glow: string }> = {
  mint: {
    fill: 'rgba(68, 176, 112, 0.08)',
    stroke: 'rgba(105, 226, 154, 0.3)',
    text: '#82e8a4',
    glow: 'rgba(99, 242, 162, 0.18)',
  },
  amber: {
    fill: 'rgba(224, 153, 44, 0.08)',
    stroke: 'rgba(248, 180, 69, 0.32)',
    text: '#ffc263',
    glow: 'rgba(251, 174, 54, 0.18)',
  },
  cyan: {
    fill: 'rgba(55, 171, 210, 0.08)',
    stroke: 'rgba(80, 205, 246, 0.34)',
    text: '#76ddff',
    glow: 'rgba(70, 200, 241, 0.18)',
  },
  coral: {
    fill: 'rgba(226, 96, 66, 0.08)',
    stroke: 'rgba(247, 111, 82, 0.32)',
    text: '#ff906d',
    glow: 'rgba(247, 101, 70, 0.18)',
  },
}
