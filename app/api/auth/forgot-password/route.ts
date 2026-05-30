import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthRepository } from '../../../../src/data/authRepository'

const forgotPasswordSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
})

export async function POST(request: NextRequest) {
  const body = forgotPasswordSchema.safeParse(await request.json())

  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 })
  }

  const token = await getAuthRepository().generatePasswordResetToken(body.data.email)

  // 无论用户是否存在都返回 ok，防止邮箱枚举攻击
  if (process.env.NODE_ENV === 'development' && token) {
    console.log(`[DEV] 密码重置 token for ${body.data.email}: ${token}`)
  }

  return NextResponse.json({ ok: true })
}
