import { Prisma } from '@prisma/client'
import { getCellToneForCoord } from '../domain/cells/cellStyle'
import {
  getCellContentTypeLabel,
  getContentSubtitle,
  getContentTitle,
  type CellContentType,
} from '../domain/cells/cellContent'
import { prepareCellWrite, type CellWriteInput, type PreparedCellWrite } from '../domain/cells/cellWriting'
import type { CellRange } from '../domain/cells/geometry'
import type { Cell, CellPreview, Coord } from '../domain/cells/types'
import { getPrismaClient } from '../lib/prisma'

/** 单次按范围读取格子的最大返回数量，避免视口异常时一次返回过多内容。 */
export const CELL_READ_LIMIT = 500

/** 表示数据库中保存的格子记录，字段保持为持久化模型的最小读取集合。 */
export type PersistedCellRecord = {
  id: string
  x: number
  y: number
  type: CellContentType
  title: string | null
  content: string
  createdAt: Date
}

/** 表示新建格子时需要的领域输入。 */
type CreatePersistedCellInput = CellWriteInput

/** 表示创建格子的结果，调用方不需要知道底层 Prisma 错误码。 */
export type CreatePersistedCellResult =
  | { status: 'created'; cell: Cell }
  | { status: 'invalid-content' }
  | { status: 'occupied' }

/** 表示持久化适配器插入格子后的领域结果。 */
export type InsertPersistedCellResult =
  | { status: 'inserted'; cell: PersistedCellRecord }
  | { status: 'occupied' }

/** 表示格子持久化适配器需要实现的最小读写能力。 */
export type CellPersistenceStore = {
  listCellsInRange: (range: CellRange, limit: number) => Promise<PersistedCellRecord[]>
  insertCell: (cell: PreparedCellWrite) => Promise<InsertPersistedCellResult>
}

/**
 * 创建使用默认 Prisma 适配器的格子数据仓库。
 *
 * @returns 连接当前数据库的格子数据仓库，用于服务端读取和写入持久化格子。
 *
 * 副作用：会通过 Prisma Client 访问 PostgreSQL。
 */
export function getCellRepository() {
  return createCellRepository(createPrismaCellPersistenceStore())
}

/**
 * 创建 Prisma 格子持久化适配器。
 *
 * @returns 满足 CellPersistenceStore Interface 的 Prisma 适配器。
 *
 * 副作用：读取或写入时会访问 PostgreSQL；唯一约束冲突会在这里转成 occupied。
 */
export function createPrismaCellPersistenceStore(): CellPersistenceStore {
  const prisma = getPrismaClient()

  return {
    listCellsInRange: (range, limit) =>
      prisma.cell.findMany({
        where: {
          x: { gte: range.minX, lte: range.maxX },
          y: { gte: range.minY, lte: range.maxY },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    insertCell: async (cell) => {
      try {
        const created = await prisma.cell.create({ data: cell })

        return { status: 'inserted', cell: created }
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
      const cells = await store.listCellsInRange(range, CELL_READ_LIMIT)

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
      const prepared = prepareCellWrite(input)

      if (prepared.status === 'empty-content' || prepared.status === 'too-long') {
        return { status: 'invalid-content' }
      }

      if (prepared.status === 'occupied') {
        return { status: 'occupied' }
      }

      const inserted = await store.insertCell(prepared.write)

      if (inserted.status === 'occupied') {
        return { status: 'occupied' }
      }

      return { status: 'created', cell: toWallCell(inserted.cell) }
    },
  }
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

/**
 * 将持久化格子转换成前端画布使用的 Cell 结构。
 */
function toWallCell(cell: PersistedCellRecord): Cell {
  const coord: Coord = { x: cell.x, y: cell.y }

  return {
    ...coord,
    id: cell.id,
    blocks: [
      {
        id: `block:text:${cell.id}`,
        type: 'text',
        title: cell.title ?? undefined,
        content: cell.content,
      },
    ],
    previewOverride: toCellPreview(cell),
    createdAt: cell.createdAt.toISOString(),
    tone: getCellToneForCoord(coord),
  }
}

/**
 * 为持久化格子生成前端封面配置。
 */
function toCellPreview(cell: PersistedCellRecord): CellPreview {
  return {
    source: 'template',
    template: 'text',
    title: cell.title || getContentTitle(cell.content),
    subtitle: getContentSubtitle(cell.content),
    label: getCellContentTypeLabel(cell.type),
  }
}
