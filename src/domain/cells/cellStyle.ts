import type { CellContentType } from './cellContent'
import type { CellTone, Coord } from './types'

/**
 * 表示单元格色调对应的一整套绘制颜色。
 *
 * cover 开头的字段专门用于未点开时的封面卡片渲染。
 */
export type CellToneStyle = {
  fill: string
  stroke: string
  text: string
  glow: string
  coverTop: string
  coverBottom: string
  coverAccent: string
  coverText: string
  coverMuted: string
}

/**
 * 单元格色调到实际绘制颜色的映射表。
 *
 * fill、stroke、text、glow 用于基础绘制，cover 系列字段用于封面卡片。
 */
export const toneMap: Record<CellTone, CellToneStyle> = {
  mint: {
    fill: 'rgba(68, 176, 112, 0.08)',
    stroke: 'rgba(105, 226, 154, 0.3)',
    text: '#82e8a4',
    glow: 'rgba(99, 242, 162, 0.18)',
    coverTop: '#13231b',
    coverBottom: '#0b1511',
    coverAccent: 'rgba(130, 232, 164, 0.72)',
    coverText: '#e8fff2',
    coverMuted: '#9fcbb1',
  },
  amber: {
    fill: 'rgba(224, 153, 44, 0.08)',
    stroke: 'rgba(248, 180, 69, 0.32)',
    text: '#ffc263',
    glow: 'rgba(251, 174, 54, 0.18)',
    coverTop: '#251d10',
    coverBottom: '#15110b',
    coverAccent: 'rgba(255, 194, 99, 0.72)',
    coverText: '#fff3d8',
    coverMuted: '#d6b982',
  },
  cyan: {
    fill: 'rgba(55, 171, 210, 0.08)',
    stroke: 'rgba(80, 205, 246, 0.34)',
    text: '#76ddff',
    glow: 'rgba(70, 200, 241, 0.18)',
    coverTop: '#11212a',
    coverBottom: '#0b151a',
    coverAccent: 'rgba(118, 221, 255, 0.7)',
    coverText: '#e9fbff',
    coverMuted: '#9bc7d4',
  },
  coral: {
    fill: 'rgba(226, 96, 66, 0.08)',
    stroke: 'rgba(247, 111, 82, 0.32)',
    text: '#ff906d',
    glow: 'rgba(247, 101, 70, 0.18)',
    coverTop: '#281814',
    coverBottom: '#170f0d',
    coverAccent: 'rgba(255, 144, 109, 0.72)',
    coverText: '#fff0eb',
    coverMuted: '#d9aa9b',
  },
}

/**
 * 根据坐标稳定地选择一个单元格色调。
 *
 * @param coord 单元格坐标。
 * @returns 与坐标绑定的色调名称。
 */
export function getCellToneForCoord(coord: Coord): CellTone {
  const tones: CellTone[] = ['mint', 'amber', 'cyan', 'coral']
  return tones[Math.abs(coord.x * 7 + coord.y * 13) % tones.length]
}

/** 内容类型到单元格色调的映射表。 */
const cellTypeToneMap: Record<CellContentType, CellTone> = {
  THOUGHT: 'mint',
  NOTE: 'amber',
  QUESTION: 'cyan',
  TREE_HOLE: 'coral',
}

/**
 * 根据单元格内容类型稳定地选择色调。
 *
 * @param type 持久化格子的内容类型。
 * @returns 与该内容类型绑定的色调名称；未知类型降级为 mint。
 */
export function getCellToneForType(type: CellContentType): CellTone {
  return cellTypeToneMap[type] ?? 'mint'
}
