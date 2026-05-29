import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CONTENT_LIMIT } from '../../../src/domain/cells/constants'
import { getCellToneForCoord } from '../../../src/domain/cells/cellAuthoring'
import type { Cell, CellPreview, Coord } from '../../../src/domain/cells/types'
import { getPrismaClient } from '../../../src/lib/prisma'

const cellTypeLabels = {
  THOUGHT: '随想',
  NOTE: '笔记',
  QUESTION: '提问',
  TREE_HOLE: '树洞',
} as const

const rangeQuerySchema = z
  .object({
    minX: z.coerce.number().int(),
    maxX: z.coerce.number().int(),
    minY: z.coerce.number().int(),
    maxY: z.coerce.number().int(),
  })
  .refine((range) => range.minX <= range.maxX && range.minY <= range.maxY, {
    message: '坐标范围不合法',
  })

const createCellSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  type: z.enum(['THOUGHT', 'NOTE', 'QUESTION', 'TREE_HOLE']).default('THOUGHT'),
  content: z.string().trim().min(1).max(CONTENT_LIMIT),
})

type DatabaseCell = {
  id: string
  x: number
  y: number
  type: keyof typeof cellTypeLabels
  title: string | null
  content: string
  createdAt: Date
}

/**
 * 读取指定坐标范围内的格子。
 *
 * @param request Next.js 请求对象，查询参数中需要包含 minX、maxX、minY 和 maxY。
 * @returns JSON 响应，成功时返回当前范围内的格子列表，失败时返回错误信息。
 */
export async function GET(request: NextRequest) {
  const query = rangeQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  if (!query.success) {
    return NextResponse.json({ error: '坐标范围不合法' }, { status: 400 })
  }

  const { minX, maxX, minY, maxY } = query.data
  const prisma = getPrismaClient()
  const cells = await prisma.cell.findMany({
    where: {
      x: { gte: minX, lte: maxX },
      y: { gte: minY, lte: maxY },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return NextResponse.json({ cells: cells.map(toApiCell) })
}

/**
 * 写入一个新的格子。
 *
 * @param request Next.js 请求对象，body 中需要包含 x、y、content 和可选 type。
 * @returns JSON 响应，成功时返回新格子；坐标已占用时返回 409。
 */
export async function POST(request: NextRequest) {
  const body = createCellSchema.safeParse(await request.json())

  if (!body.success) {
    return NextResponse.json({ error: '格子内容不合法' }, { status: 400 })
  }

  try {
    const cell = await getPrismaClient().cell.create({
      data: {
        x: body.data.x,
        y: body.data.y,
        type: body.data.type,
        title: getContentTitle(body.data.content),
        content: body.data.content,
      },
    })

    return NextResponse.json({ cell: toApiCell(cell) }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '这个格子已经被占用' }, { status: 409 })
    }

    throw error
  }
}

/**
 * 将数据库格子转换成前端画布使用的 Cell 结构。
 *
 * @param cell 数据库返回的格子记录。
 * @returns 前端画布和阅读面板可直接使用的格子结构。
 */
function toApiCell(cell: DatabaseCell): Cell {
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
 * 为数据库格子生成前端封面配置。
 *
 * @param cell 数据库返回的格子记录。
 * @returns 格子封面配置，用于显示随想、笔记、提问或树洞标签。
 */
function toCellPreview(cell: DatabaseCell): CellPreview {
  return {
    source: 'template',
    template: 'text',
    title: cell.title || getContentTitle(cell.content),
    subtitle: getContentSubtitle(cell.content),
    label: cellTypeLabels[cell.type],
  }
}

/**
 * 从正文中提取封面标题。
 *
 * @param content 格子正文。
 * @returns 正文第一行；没有可用行时返回未命名内容。
 */
function getContentTitle(content: string): string {
  return getContentLines(content)[0] || '未命名内容'
}

/**
 * 从正文中提取封面副标题。
 *
 * @param content 格子正文。
 * @returns 正文第二行之后的摘要；没有可用内容时返回 undefined。
 */
function getContentSubtitle(content: string): string | undefined {
  return getContentLines(content).slice(1).join(' ') || undefined
}

/**
 * 将正文拆成已清理空白的非空行。
 *
 * @param content 格子正文。
 * @returns 非空正文行。
 */
function getContentLines(content: string): string[] {
  return content
    .split(/\s*\n\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
}
