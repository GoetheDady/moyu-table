import { getPrismaClient } from '../src/lib/prisma'

const prisma = getPrismaClient()

const demoCells = [
  { x: -5, y: -2, type: 'THOUGHT' as const, content: '保持热爱\n奔赴山海' },
  { x: -2, y: -1, type: 'THOUGHT' as const, content: '晚安' },
  { x: 1, y: 0, type: 'NOTE' as const, content: '读书笔记：\n《小王子》' },
  { x: 4, y: -1, type: 'THOUGHT' as const, content: '正在努力\n变优秀' },
  { x: -6, y: 2, type: 'THOUGHT' as const, content: '摸鱼一下' },
  { x: -2, y: 3, type: 'THOUGHT' as const, content: '生日快乐' },
  { x: 4, y: 2, type: 'THOUGHT' as const, content: '今天也要\n开心' },
  { x: 0, y: 4, type: 'THOUGHT' as const, content: '先占一个\n格子' },
  { x: 3, y: 4, type: 'THOUGHT' as const, content: '加油鸭' },
  { x: 7, y: -2, type: 'QUESTION' as const, content: '有人一起\n学 Rust 吗' },
  { x: -3, y: -5, type: 'TREE_HOLE' as const, content: '树洞：\n今天被领导说了\n有点emo' },
  { x: 2, y: -4, type: 'THOUGHT' as const, content: '中午吃了\n麻辣烫\n超好吃' },
  { x: 5, y: 3, type: 'THOUGHT' as const, content: '周末想去\n爬山🧗' },
  { x: -7, y: -3, type: 'QUESTION' as const, content: '求推荐\n好用的笔记软件' },
  { x: 6, y: 1, type: 'THOUGHT' as const, content: '今天周五\n明天不上班🎉' },
]

async function main() {
  console.log(`开始种子数据，共 ${demoCells.length} 条…`)

  let inserted = 0
  let skipped = 0

  for (const cell of demoCells) {
    const existing = await prisma.cell.findUnique({
      where: { x_y: { x: cell.x, y: cell.y } },
    })

    if (existing) {
      skipped += 1
      continue
    }

    await prisma.cell.create({
      data: {
        x: cell.x,
        y: cell.y,
        type: cell.type,
        title: cell.content.split('\n')[0],
        content: cell.content,
      },
    })

    inserted += 1
    console.log(`  ✓ (${cell.x}, ${cell.y}) ${cell.type}`)
  }

  console.log(`\n完成: ${inserted} 条新增, ${skipped} 条已存在跳过`)
}

main()
  .catch((error) => {
    console.error('种子数据失败:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
