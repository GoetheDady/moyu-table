import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthRepository } from '../../../../src/data/authRepository'

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, '密码至少 6 位'),
})

export async function POST(request: NextRequest) {
  const body = resetPasswordSchema.safeParse(await request.json())

  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 })
  }

  const result = await getAuthRepository().resetPassword(body.data.token, body.data.password)

  if (result.status === 'verification-code-expired') {
    return NextResponse.json({ error: '重置链接已过期，请重新申请' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
