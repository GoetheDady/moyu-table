import { describe, expect, test } from 'vitest'
import { getCellToneForType } from '../src/domain/cells/cellStyle'
import type { CellContentType } from '../src/domain/cells/cellContent'

describe('getCellToneForType', () => {
  /**
   * 验证每种内容类型映射到不同的色调。
   */
  test('每种内容类型映射到不同色调', () => {
    const tones = new Set(
      (['THOUGHT', 'NOTE', 'QUESTION', 'TREE_HOLE'] as CellContentType[]).map(getCellToneForType),
    )
    expect(tones.size).toBe(4)
  })

  /**
   * 验证具体类型到色调的映射。
   */
  test('THOUGHT→mint, NOTE→amber, QUESTION→cyan, TREE_HOLE→coral', () => {
    expect(getCellToneForType('THOUGHT')).toBe('mint')
    expect(getCellToneForType('NOTE')).toBe('amber')
    expect(getCellToneForType('QUESTION')).toBe('cyan')
    expect(getCellToneForType('TREE_HOLE')).toBe('coral')
  })

  /**
   * 验证未知类型降级为 mint。
   */
  test('未知类型降级为 mint', () => {
    expect(getCellToneForType('UNKNOWN' as CellContentType)).toBe('mint')
  })
})
