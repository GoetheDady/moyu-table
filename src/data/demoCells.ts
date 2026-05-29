import type { Cell } from '../domain/cells/types'

/**
 * 应用启动时展示的示例单元格数据。
 *
 * 这些数据用于提供初始视觉内容，方便在没有后端持久化的情况下观察布局和交互效果。
 */
export const initialCells: Cell[] = [
  {
    id: 'demo:-5:-2',
    x: -5,
    y: -2,
    blocks: [{ id: 'demo:-5:-2:text', type: 'text', content: '保持热爱\n奔赴山海' }],
    createdAt: '2026-05-28T08:16:00.000Z',
    tone: 'mint',
  },
  {
    id: 'demo:-2:-1',
    x: -2,
    y: -1,
    blocks: [{ id: 'demo:-2:-1:text', type: 'text', content: '晚安' }],
    createdAt: '2026-05-28T08:20:00.000Z',
    tone: 'coral',
  },
  {
    id: 'demo:1:0',
    x: 1,
    y: 0,
    blocks: [{ id: 'demo:1:0:text', type: 'text', content: '读书笔记：\n《小王子》' }],
    createdAt: '2026-05-28T08:24:00.000Z',
    tone: 'cyan',
  },
  {
    id: 'demo:4:-1',
    x: 4,
    y: -1,
    blocks: [{ id: 'demo:4:-1:text', type: 'text', content: '正在努力\n变优秀' }],
    createdAt: '2026-05-28T08:27:00.000Z',
    tone: 'coral',
  },
  {
    id: 'demo:-6:2',
    x: -6,
    y: 2,
    blocks: [{ id: 'demo:-6:2:text', type: 'text', content: '摸鱼一下' }],
    createdAt: '2026-05-28T08:31:00.000Z',
    tone: 'amber',
  },
  {
    id: 'demo:-2:3',
    x: -2,
    y: 3,
    blocks: [{ id: 'demo:-2:3:text', type: 'text', content: '生日快乐' }],
    createdAt: '2026-05-28T08:35:00.000Z',
    tone: 'amber',
  },
  {
    id: 'demo:4:2',
    x: 4,
    y: 2,
    blocks: [{ id: 'demo:4:2:text', type: 'text', content: '今天也要\n开心' }],
    createdAt: '2026-05-28T08:38:00.000Z',
    tone: 'cyan',
  },
  {
    id: 'demo:0:4',
    x: 0,
    y: 4,
    blocks: [{ id: 'demo:0:4:text', type: 'text', content: '先占一个\n格子' }],
    createdAt: '2026-05-28T08:42:00.000Z',
    tone: 'mint',
  },
  {
    id: 'demo:3:4',
    x: 3,
    y: 4,
    blocks: [{ id: 'demo:3:4:text', type: 'text', content: '加油鸭' }],
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
