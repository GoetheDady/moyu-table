import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCellRepository } from '../../../src/data/cellRepository'
import { cellContentTypes } from '../../../src/domain/cells/cellPresentation'

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
  type: z.enum(cellContentTypes).default('THOUGHT'),
  content: z.string(),
})

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

  const cells = await getCellRepository().listCellsInRange(query.data)

  return NextResponse.json({ cells })
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

  const result = await getCellRepository().createCell(body.data)

  if (result.status === 'invalid-content') {
    return NextResponse.json({ error: '格子内容不合法' }, { status: 400 })
  }

  if (result.status === 'occupied') {
    return NextResponse.json({ error: '这个格子已经被占用' }, { status: 409 })
  }

  return NextResponse.json({ cell: result.cell }, { status: 201 })
}
