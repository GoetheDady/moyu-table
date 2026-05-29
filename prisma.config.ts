import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const placeholderDatabaseUrl = 'postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? placeholderDatabaseUrl,
  },
})
