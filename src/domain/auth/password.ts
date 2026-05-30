import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SALT_LENGTH = 16
const KEY_LENGTH = 64
const SEPARATOR = ':'

/**
 * 使用 scrypt 哈希密码。
 *
 * @param password 明文密码。
 * @returns base64 编码的 "salt:hash" 格式字符串。
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('base64')
  const hash = await scryptAsync(password, salt, KEY_LENGTH)

  return `${salt}${SEPARATOR}${hash}`
}

/**
 * 验证密码是否匹配存储的哈希值。
 *
 * @param password 待验证的明文密码。
 * @param stored "salt:hash" 格式的存储哈希。
 * @returns 匹配返回 true。
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(SEPARATOR)

  if (!salt || !hash) return false

  const derived = await scryptAsync(password, salt, KEY_LENGTH)

  return timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(derived, 'base64'))
}

/**
 * 使用 scrypt 派生密钥的 Promise 封装。
 */
function scryptAsync(password: string, salt: string, keylen: number): Promise<string> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (error, derivedKey) => {
      if (error) {
        reject(error)
      } else {
        resolve(derivedKey.toString('base64'))
      }
    })
  })
}
