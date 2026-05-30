import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthRepository } from '../../../../src/data/authRepository'

const sendCodeSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
})

export async function POST(request: NextRequest) {
  const body = sendCodeSchema.safeParse(await request.json())

  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 })
  }

  const code = await getAuthRepository().generateVerificationCode(body.data.email)

  return NextResponse.json({ ok: true, code: process.env.NODE_ENV === 'development' ? code : undefined })
}
