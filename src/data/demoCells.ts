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
