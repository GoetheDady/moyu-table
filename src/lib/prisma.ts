import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

/**
 * 获取应用共享的 Prisma Client 实例。
 *
 * @returns Prisma Client 实例，用于服务端代码访问 PostgreSQL。
 *
 * 副作用：在开发环境下会把实例挂到 globalThis，避免 Next.js 热更新时重复创建数据库连接。
 */
export function getPrismaClient() {
  const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }

  return prisma
}
