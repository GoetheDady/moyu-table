import { getPrismaClient } from '../lib/prisma'
import { hashPassword, verifyPassword } from '../domain/auth/password'

/** 表示注册或登录的结果。 */
export type AuthResult =
  | { status: 'success'; userId: string }
  | { status: 'invalid-credentials' }
  | { status: 'email-already-exists' }
  | { status: 'verification-code-expired' }
  | { status: 'verification-code-invalid' }
  | { status: 'user-not-found' }

/**
 * 创建认证数据访问模块。
 *
 * @returns 提供注册、登录、验证码和密码重置操作。
 *
 * 副作用：读写 PostgreSQL 中的 User、VerificationCode 和 PasswordResetToken 表。
 */
export function getAuthRepository() {
  const prisma = getPrismaClient()

  return {
    /**
     * 注册新用户。
     *
     * 先校验验证码，通过后创建用户并标记验证码已使用。
     *
     * @param email 用户邮箱。
     * @param password 明文密码。
     * @param code 邮箱验证码。
     * @returns 注册结果。
     *
     * 副作用：创建 User 记录，更新 VerificationCode 为已使用。
     */
    async register(email: string, password: string, code: string): Promise<AuthResult> {
      const verificationResult = await verifyCode(email, code)

      if (verificationResult !== 'ok') {
        return verificationResult
      }

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return { status: 'email-already-exists' }
      }

      const passwordHash = await hashPassword(password)

      await prisma.user.create({
        data: { email, passwordHash },
      })

      // 标记验证码已使用
      await prisma.verificationCode.updateMany({
        where: { email, code, used: false },
        data: { used: true },
      })

      const user = await prisma.user.findUnique({ where: { email } })

      return { status: 'success', userId: user!.id }
    },

    /**
     * 使用邮箱和密码登录。
     *
     * @param email 用户邮箱。
     * @param password 明文密码。
     * @returns 登录成功返回 userId。
     */
    async login(email: string, password: string): Promise<AuthResult> {
      const user = await prisma.user.findUnique({ where: { email } })

      if (!user) {
        return { status: 'invalid-credentials' }
      }

      const valid = await verifyPassword(password, user.passwordHash)

      if (!valid) {
        return { status: 'invalid-credentials' }
      }

      return { status: 'success', userId: user.id }
    },

    /**
     * 生成并存储邮箱验证码。
     *
     * @param email 目标邮箱。
     * @returns 6 位数字验证码。
     *
     * 副作用：写入 VerificationCode 表。
     */
    async generateVerificationCode(email: string): Promise<string> {
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 分钟有效

      await prisma.verificationCode.create({
        data: { email, code, expiresAt },
      })

      // 开发模式下打印验证码到控制台
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] 验证码 for ${email}: ${code}`)
      }

      return code
    },

    /**
     * 生成密码重置 Token 并返回。
     *
     * @param email 用户邮箱。
     * @returns 重置 token；用户不存在时返回 null。
     *
     * 副作用：写入 PasswordResetToken 表。
     */
    async generatePasswordResetToken(email: string): Promise<string | null> {
      const user = await prisma.user.findUnique({ where: { email } })

      if (!user) return null

      const token = randomToken()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 分钟有效

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      })

      return token
    },

    /**
     * 使用重置 Token 更新密码。
     *
     * @param token 密码重置 token。
     * @param newPassword 新明文密码。
     * @returns 重置结果。
     *
     * 副作用：更新 User 密码哈希，标记 PasswordResetToken 为已使用。
     */
    async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
      const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        return { status: 'verification-code-expired' }
      }

      const passwordHash = await hashPassword(newPassword)

      await prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      })

      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      })

      return { status: 'success', userId: resetToken.userId }
    },
  }
}

/**
 * 校验邮箱验证码。
 */
async function verifyCode(email: string, code: string): Promise<AuthResult | 'ok'> {
  const prisma = getPrismaClient()

  const record = await prisma.verificationCode.findFirst({
    where: { email, code, used: false },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return { status: 'verification-code-invalid' }
  }

  if (record.expiresAt < new Date()) {
    return { status: 'verification-code-expired' }
  }

  return 'ok'
}

/**
 * 生成安全的随机 token 字符串。
 */
function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
