import { describe, expect, test } from 'vitest'
import {
  cellContentTypes,
  getCellBlockTypeLabel,
  getCellContentTypeLabel,
  getContentBodyWithoutTitle,
  getContentSubtitle,
  getContentTitle,
} from '../src/domain/cells/cellContent'

describe('Cell content language', () => {
  /**
   * 验证内容类型集合与当前第一版持久化类型保持一致。
   *
   * 内容类型是数据库和界面共同使用的语言，集中测试可以避免展示层承担校验职责。
   */
  test('保留第一版持久化内容类型集合', () => {
    expect(cellContentTypes).toEqual(['THOUGHT', 'NOTE', 'QUESTION', 'TREE_HOLE'])
  })

  /**
   * 验证标题和副标题会从正文非空行生成。
   *
   * @returns 无返回值，断言标题来自第一个非空正文行，副标题来自后续正文行。
   */
  test('从正文行提取标题和副标题', () => {
    expect(getContentTitle(' \n  先写一句 \n 第二句')).toBe('先写一句')
    expect(getContentTitle('  \n  ')).toBe('未命名内容')
    expect(getContentSubtitle('标题\n 副标题 \n 第三行')).toBe('副标题 第三行')
    expect(getContentSubtitle('只有标题')).toBeUndefined()
  })

  /**
   * 验证内容语言 Module 负责统一标签文案。
   *
   * 标签文案是界面展示用语，集中后 route、client 和展示映射不用各自维护一份。
   */
  test('生成内容类型和内容块类型标签', () => {
    expect(getCellContentTypeLabel('QUESTION')).toBe('提问')
    expect(getCellBlockTypeLabel('text')).toBe('文字')
  })

  /**
   * 验证阅读正文会去掉已经作为标题展示的第一行。
   *
   * @returns 无返回值，断言重复标题不会再次出现在正文里。
   */
  test('去掉已经展示为标题的正文第一行', () => {
    expect(getContentBodyWithoutTitle('标题\n正文第一段\n正文第二段', '标题')).toBe('正文第一段\n正文第二段')
    expect(getContentBodyWithoutTitle('正文不等于标题', '标题')).toBe('正文不等于标题')
  })
})
