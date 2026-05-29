import { Prisma } from '@prisma/client'
import { CONTENT_LIMIT } from '../domain/cells/constants'
import {
  getContentTitle,
  toWallCell,
  type CellContentType,
  type CellPresentationRecord,
} from '../domain/cells/cellPresentation'
import type { CellRange } from '../domain/cells/geometry'
import type { Cell } from '../domain/cells/types'
import { getPrismaClient } from '../lib/prisma'

export type PersistedCellType = CellContentType

/** 单次按范围读取格子的最大返回数量，避免视口异常时一次返回过多内容。 */
export const CELL_READ_LIMIT = 500

/** 表示数据库中保存的格子记录，字段保持为持久化模型的最小读取集合。 */
export type PersistedCellRecord = CellPresentationRecord

/** 表示新建格子时需要的领域输入。 */
export type CreatePersistedCellInput = {
  x: number
  y: number
  type?: PersistedCellType
  content: string
}

/** 表示创建格子的结果，调用方不需要知道底层 Prisma 错误码。 */
export type CreatePersistedCellResult =
  | { status: 'created'; cell: Cell }
  | { status: 'invalid-content' }
  | { status: 'occupied' }

/** 表示格子持久化适配器需要实现的最小读写能力。 */
export type CellPersistenceStore = {
  findMany: (args: CellFindManyArgs) => Promise<PersistedCellRecord[]>
  create: (args: CellCreateArgs) => Promise<PersistedCellRecord>
}

/** 表示按坐标范围读取格子时传给持久化适配器的查询参数。 */
export type CellFindManyArgs = {
  where: {
    x: { gte: number; lte: number }
    y: { gte: number; lte: number }
  }
  orderBy: { createdAt: 'desc' }
  take: number
}

/** 表示创建格子时传给持久化适配器的写入参数。 */
export type CellCreateArgs = {
  data: {
    x: number
    y: number
    type: PersistedCellType
    title: string
    content: string
  }
}

/**
 * 创建使用默认 Prisma 适配器的格子数据仓库。
 *
 * @returns 连接当前数据库的格子数据仓库，用于服务端读取和写入持久化格子。
 *
 * 副作用：会通过 Prisma Client 访问 PostgreSQL。
 */
export function getCellRepository() {
  const prisma = getPrismaClient()

  return createCellRepository({
    findMany: (args) => prisma.cell.findMany(args),
    create: (args) => prisma.cell.create(args),
  })
}

/**
 * 创建格子数据仓库。
 *
 * @param store 底层持久化适配器，生产环境使用 Prisma，测试可使用内存适配器。
 * @returns 提供按范围读取和创建格子的 Module，隐藏查询参数、内容整理和冲突翻译。
 */
export function createCellRepository(store: CellPersistenceStore) {
  return {
    /**
     * 按单元格坐标范围读取格子。
     *
     * @param range 可见单元格坐标范围，x 和 y 都使用用户可见的格子坐标方向。
     * @returns 已转换为前端格子模型的结果列表，按创建时间倒序返回，最多 CELL_READ_LIMIT 条。
     */
    async listCellsInRange(range: CellRange): Promise<Cell[]> {
      const cells = await store.findMany({
        where: {
          x: { gte: range.minX, lte: range.maxX },
          y: { gte: range.minY, lte: range.maxY },
        },
        orderBy: { createdAt: 'desc' },
        take: CELL_READ_LIMIT,
      })

      return cells.map(toWallCell)
    },

    /**
     * 创建一个持久化格子。
     *
     * @param input 新建格子的坐标、内容和可选类型。
     * @returns 创建成功、内容不合法或坐标已占用三种结果之一。
     *
     * 副作用：成功时会写入 PostgreSQL；坐标唯一约束冲突会被转换为 occupied 状态。
     */
    async createCell(input: CreatePersistedCellInput): Promise<CreatePersistedCellResult> {
      const content = normalizeContent(input.content)

      if (!content) {
        return { status: 'invalid-content' }
      }

      try {
        const cell = await store.create({
          data: {
            x: input.x,
            y: input.y,
            type: input.type ?? 'THOUGHT',
            title: getContentTitle(content),
            content,
          },
        })

        return { status: 'created', cell: toWallCell(cell) }
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return { status: 'occupied' }
        }

        throw error
      }
    },
  }
}

/**
 * 整理并校验格子正文。
 *
 * @param content 用户提交的原始正文。
 * @returns 去除首尾空白后的正文；如果为空或超过限制则返回 null。
 */
function normalizeContent(content: string): string | null {
  const trimmed = content.trim()

  if (!trimmed || trimmed.length > CONTENT_LIMIT) {
    return null
  }

  return trimmed
}

/**
 * 判断错误是否为坐标唯一约束冲突。
 *
 * @param error 捕获到的未知错误。
 * @returns 如果是 Prisma P2002 唯一约束错误则返回 true。
 */
function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
