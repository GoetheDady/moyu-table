import { Prisma } from '@prisma/client'
import { describe, expect, test } from 'vitest'
import {
  CELL_READ_LIMIT,
  createCellRepository,
  type CellCreateArgs,
  type CellPersistenceStore,
  type PersistedCellRecord,
} from '../src/data/cellRepository'

describe('Cell repository', () => {
  /**
   * 验证按范围读取格子时，Repository 会隐藏 Prisma 查询参数并返回前端格子模型。
   *
   * Repository 是数据仓库模块，用来把底层数据库读写细节集中在一个 Interface 后面。
   */
  test('按单元格坐标范围读取并映射为墙面格子', async () => {
    const createdAt = new Date('2026-05-29T09:00:00.000Z')
    const store = createMemoryStore({
      findMany: async (args) => {
        expect(args).toEqual({
          where: {
            x: { gte: -2, lte: 4 },
            y: { gte: 5, lte: 9 },
          },
          orderBy: { createdAt: 'desc' },
          take: CELL_READ_LIMIT,
        })

        return [
          {
            id: 'cell-1',
            x: 1,
            y: 6,
            type: 'NOTE',
            title: '读书笔记',
            content: '读书笔记\n第二行',
            createdAt,
          },
        ]
      },
    })
    const repository = createCellRepository(store)

    const cells = await repository.listCellsInRange({ minX: -2, maxX: 4, minY: 5, maxY: 9 })

    expect(cells).toHaveLength(1)
    expect(cells[0]).toMatchObject({
      id: 'cell-1',
      x: 1,
      y: 6,
      createdAt: createdAt.toISOString(),
      blocks: [
        {
          id: 'block:text:cell-1',
          type: 'text',
          title: '读书笔记',
          content: '读书笔记\n第二行',
        },
      ],
      previewOverride: {
        title: '读书笔记',
        subtitle: '第二行',
        label: '笔记',
      },
    })
  })

  /**
   * 验证创建格子时，Repository 会整理正文、生成标题并隐藏持久化返回结构。
   *
   * 副作用：使用内存适配器记录写入参数，不访问真实数据库。
   */
  test('创建格子时整理正文并返回墙面格子', async () => {
    const createdAt = new Date('2026-05-29T10:00:00.000Z')
    let createArgs: CellCreateArgs | null = null
    const store = createMemoryStore({
      create: async (args) => {
        createArgs = args

        return {
          id: 'cell-2',
          x: args.data.x,
          y: args.data.y,
          type: args.data.type,
          title: args.data.title,
          content: args.data.content,
          createdAt,
        }
      },
    })
    const repository = createCellRepository(store)

    const result = await repository.createCell({
      x: -3,
      y: 8,
      type: 'TREE_HOLE',
      content: '  不想开会\n想喝咖啡  ',
    })

    expect(createArgs).toEqual({
      data: {
        x: -3,
        y: 8,
        type: 'TREE_HOLE',
        title: '不想开会',
        content: '不想开会\n想喝咖啡',
      },
    })
    expect(result).toMatchObject({
      status: 'created',
      cell: {
        id: 'cell-2',
        previewOverride: {
          title: '不想开会',
          subtitle: '想喝咖啡',
          label: '树洞',
        },
      },
    })
  })

  /**
   * 验证创建格子时，Repository 会把 Prisma 唯一约束冲突翻译为 occupied 状态。
   *
   * 唯一约束冲突表示同一个坐标已经存在格子，不应该把 Prisma 错误码泄漏给调用方。
   */
  test('创建格子时把坐标冲突翻译为 occupied', async () => {
    const store = createMemoryStore({
      create: async () => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['x', 'y'] },
        })
      },
    })
    const repository = createCellRepository(store)

    await expect(repository.createCell({ x: 1, y: 2, content: '已经有人写了' })).resolves.toEqual({
      status: 'occupied',
    })
  })

  /**
   * 验证内容不合法时，Repository 不会调用持久化适配器。
   *
   * @returns 无返回值，断言空白内容直接返回 invalid-content。
   */
  test('创建格子时拒绝空白内容', async () => {
    let didCallCreate = false
    const store = createMemoryStore({
      create: async () => {
        didCallCreate = true
        throw new Error('不应该写入空白内容')
      },
    })
    const repository = createCellRepository(store)

    await expect(repository.createCell({ x: 0, y: 0, content: '   ' })).resolves.toEqual({
      status: 'invalid-content',
    })
    expect(didCallCreate).toBe(false)
  })
})

/**
 * 创建测试用内存持久化适配器。
 *
 * @param overrides 需要覆盖的 findMany 或 create 行为。
 * @returns 满足 CellPersistenceStore Interface 的测试适配器。
 */
function createMemoryStore(overrides: Partial<CellPersistenceStore>): CellPersistenceStore {
  return {
    findMany: overrides.findMany ?? defaultFindMany,
    create: overrides.create ?? defaultCreate,
  }
}

/**
 * 默认读取空格子列表。
 *
 * @returns 空格子记录列表。
 */
async function defaultFindMany(): Promise<PersistedCellRecord[]> {
  return []
}

/**
 * 默认创建行为，用于提醒测试必须显式声明写入结果。
 *
 * @returns 永不返回，调用时抛出错误。
 */
async function defaultCreate(): Promise<PersistedCellRecord> {
  throw new Error('测试需要显式提供 create 行为')
}
