import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

describe('Prisma schema', () => {
  /**
   * 验证数据库模型已经为格子坐标和内容持久化做好最小准备。
   *
   * @returns 无返回值，断言 Prisma schema 包含 Cell 模型和坐标唯一约束。
   */
  test('定义 Cell 模型和坐标唯一约束', () => {
    const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8')

    expect(schema).toContain('model Cell {')
    expect(schema).toContain('@@unique([x, y])')
    expect(schema).toContain('enum CellType {')
  })
})
