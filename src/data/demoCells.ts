import type { Cell } from '../lib/types.js'

/**
 * 应用启动时展示的示例单元格数据。
 *
 * 这些数据用于提供初始视觉内容，方便在没有后端持久化的情况下观察布局和交互效果。
 */
export const initialCells: Cell[] = [
  {
    x: -5,
    y: -2,
    content: '保持热爱\n奔赴山海',
    createdAt: '2026-05-28T08:16:00.000Z',
    tone: 'mint',
  },
  {
    x: -2,
    y: -1,
    content: '晚安',
    createdAt: '2026-05-28T08:20:00.000Z',
    tone: 'coral',
  },
  {
    x: 1,
    y: 0,
    content: '读书笔记：\n《小王子》',
    createdAt: '2026-05-28T08:24:00.000Z',
    tone: 'cyan',
  },
  {
    x: 4,
    y: -1,
    content: '正在努力\n变优秀',
    createdAt: '2026-05-28T08:27:00.000Z',
    tone: 'coral',
  },
  {
    x: -6,
    y: 2,
    content: '摸鱼一下',
    createdAt: '2026-05-28T08:31:00.000Z',
    tone: 'amber',
  },
  {
    x: -2,
    y: 3,
    content: '生日快乐',
    createdAt: '2026-05-28T08:35:00.000Z',
    tone: 'amber',
  },
  {
    x: 4,
    y: 2,
    content: '今天也要\n开心',
    createdAt: '2026-05-28T08:38:00.000Z',
    tone: 'cyan',
  },
  {
    x: 0,
    y: 4,
    content: '先占一个\n格子',
    createdAt: '2026-05-28T08:42:00.000Z',
    tone: 'mint',
  },
  {
    x: 3,
    y: 4,
    content: '加油鸭',
    createdAt: '2026-05-28T08:46:00.000Z',
    tone: 'amber',
  },
]

/**
 * 画布背景中的装饰发光点数据。
 *
 * 每个点使用世界坐标定位，并在绘制时投影到屏幕空间。
 */
export const sparkles = [
  { x: -680, y: -360, color: 'rgba(112, 245, 177, 0.72)' },
  { x: -320, y: -245, color: 'rgba(255, 184, 76, 0.76)' },
  { x: 42, y: -310, color: 'rgba(107, 218, 255, 0.66)' },
  { x: 420, y: -210, color: 'rgba(119, 246, 186, 0.74)' },
  { x: 770, y: -330, color: 'rgba(255, 121, 92, 0.7)' },
  { x: -520, y: 210, color: 'rgba(92, 219, 255, 0.72)' },
  { x: -80, y: 310, color: 'rgba(113, 246, 180, 0.78)' },
  { x: 330, y: 205, color: 'rgba(255, 119, 94, 0.72)' },
  { x: 610, y: 360, color: 'rgba(88, 220, 255, 0.66)' },
  { x: -760, y: 470, color: 'rgba(112, 245, 177, 0.72)' },
  { x: -300, y: 520, color: 'rgba(92, 219, 255, 0.7)' },
  { x: 260, y: 480, color: 'rgba(255, 184, 76, 0.76)' },
]
