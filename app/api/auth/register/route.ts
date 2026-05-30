import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthRepository } from '../../../../src/data/authRepository'

const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
  code: z.string().length(6, '验证码为 6 位数字'),
})

export async function POST(request: NextRequest) {
  const body = registerSchema.safeParse(await request.json())

  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 })
  }

  const result = await getAuthRepository().register(body.data.email, body.data.password, body.data.code)

  if (result.status === 'email-already-exists') {
    return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 })
  }

  if (result.status === 'verification-code-invalid') {
    return NextResponse.json({ error: '验证码错误' }, { status: 400 })
  }

  if (result.status === 'verification-code-expired') {
    return NextResponse.json({ error: '验证码已过期' }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
