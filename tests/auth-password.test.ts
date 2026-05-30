import { describe, expect, test } from 'vitest'
import { hashPassword, verifyPassword } from '../src/domain/auth/password'

describe('password hashing', () => {
  /**
   * 验证密码哈希后可以正确验证。
   */
  test('哈希后再验证应返回 true', async () => {
    const password = 'mypassword123'
    const hashed = await hashPassword(password)

    expect(hashed).toContain(':')
    expect(await verifyPassword(password, hashed)).toBe(true)
  })

  /**
   * 验证错误密码不匹配。
   */
  test('错误密码验证应返回 false', async () => {
    const hashed = await hashPassword('correct')

    expect(await verifyPassword('wrong', hashed)).toBe(false)
  })

  /**
   * 验证无效格式的哈希不会抛异常。
   */
  test('无效格式的哈希返回 false', async () => {
    expect(await verifyPassword('anything', 'invalid')).toBe(false)
    expect(await verifyPassword('anything', '')).toBe(false)
  })
})
