import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCellRepository } from '../../../src/data/cellRepository'
import { toCreateCellHttpResponse } from '../../../src/data/cellTransport'
import { cellContentTypes } from '../../../src/domain/cells/cellContent'

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

export async function GET(request: NextRequest) {
  const query = rangeQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  if (!query.success) {
    return NextResponse.json({ error: '坐标范围不合法' }, { status: 400 })
  }

  const cells = await getCellRepository().listCellsInRange(query.data)

  return NextResponse.json({ cells })
}

export async function POST(request: NextRequest) {
  const body = createCellSchema.safeParse(await request.json())

  if (!body.success) {
    const response = toCreateCellHttpResponse({ status: 'invalid-content' })

    return NextResponse.json(response.body, { status: response.status })
  }

  const result = await getCellRepository().createCell(body.data)
  const response = toCreateCellHttpResponse(result)

  return NextResponse.json(response.body, { status: response.status })
}
