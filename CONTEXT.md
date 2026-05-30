# CONTEXT.md — moyu-table 领域语言

本文档记录项目的业务概念、命名约定和核心规则，供工程类技能（`diagnose`、`improve-codebase-architecture`、`tdd`、`grill-with-docs`）理解领域含义时使用。

## 项目简介

moyu-table 是一个"上班摸鱼时可以闲逛、写想法、记笔记，也能偶尔当树洞用"的无限格子墙（Infinite Grid Wall）。用户在二维平面上选择坐标、写入内容，其他人可以在同一面墙上浏览、阅读。

技术栈：Next.js App Router + PostgreSQL + Prisma + Canvas 客户端渲染。

## 术语表

### 核心概念

- **格子 / 单元格 (Cell)**：网格墙上的一个坐标位置及其写入的内容。每个坐标最多被一个格子占用。格子写入后对所有人可见。
- **坐标 (Coord)**：二维整数坐标 `{x, y}`。x 向右递增，y **向上递增**（项目约定，与屏幕坐标 y 向下递增相反）。
- **世界坐标 (World Coordinate)**：Canvas 世界坐标系中的坐标。世界 y 向下为正，与单元格 y 方向相反。`cellToWorldY` / `worldToCellY` 负责互相转换。
- **屏幕坐标 (Screen Coordinate)**：浏览器视口内的像素坐标，原点在左上角。
- **透视网格 (Perspective Grid)**：用透视投影绘制的斜视墙面网格，产生空间纵深感。`createPerspectiveGrid` 创建绑定了相机、缩放和视口的透视工具对象。
- **相机 (Camera)**：观察者在世界坐标系中的位置 `{x, y}`。移动相机等价于平移视口，缩放改变相机与世界的映射关系。
- **视口 (Viewport)**：浏览器中 Canvas 可绘制区域的宽高。
- **缩放 (Zoom)**：透视网格的缩放倍数，范围 `[0.5, 2]`。
- **跳转 (Jump)**：通过坐标输入框快速移动相机到指定单元格位置，带缓入缓出动画。

### 内容相关

- **内容类型 (CellContentType / CellType)**：格子的持久化内容分类。枚举值：
  - `THOUGHT`（随想）：随手记下的想法。
  - `NOTE`（笔记）：稍正式一些的记录。
  - `QUESTION`（提问）：向路人提出的问题。
  - `TREE_HOLE`（树洞）：匿名倾诉。
- **内容块 (CellBlock)**：格子内的一个内容单元，有 `type`（text / question / image / artText / drawing）和 `content` 正文。第一版只有 text 类型实际启用，其余为后续预留。
- **内容块类型 (CellBlockType)**：`'text' | 'question' | 'image' | 'artText' | 'drawing'`。文本类型的实际内容存于 `content` 字段。
- **封面 (CellPreview)**：格子在未点开时的展示预览。第一版以前端 template 动态生成；`imageUrl` 和 `drawingSnapshot` 来源为后续预留。
- **色调 (CellTone)**：格子的视觉配色，可选 `'mint' | 'amber' | 'cyan' | 'coral'`。色调统一在 `toneMap` 中维护具体颜色值。
- **占用 (Occupied)**：坐标已有格子的状态。写入前通过 `prepareCellWrite` 做前端体验检查，最终以持久化层的唯一约束 `@@unique([x, y])` 保证。
- **内容限制 (CONTENT_LIMIT)**：每个格子最多 200 字符。

### 数据层

- **格子持久化**：通过 Prisma 写入 PostgreSQL。Cell 模型用 `@@unique([x, y])` 保证坐标唯一，`@@index([x, y])` 支持视口范围查询。
- **范围查询 (CellRange)**：`{minX, maxX, minY, maxY}` 用于查询当前视口内的格子，y 方向使用向上递增的单元格坐标。
- **格子传输层 (cellTransport)**：封装了从服务端 API 获取格子数据的网络请求逻辑。

### 架构分层

```
src/
├── domain/cells/     # 领域模型：类型定义、几何计算、内容规则、写入前置校验
├── data/             # 数据适配器：Prisma 仓库、API 客户端、传输层、种子数据
├── features/wall/    # 功能组件：Canvas 网格、交互、面板、跳转、场景管理
└── lib/              # 通用工具（目前仅 prisma 单例）
```

- **领域层 (domain/cells/)** 不依赖 React 或浏览器 API，可独立测试。
- **数据层 (data/)** 封装持久化和网络访问。
- **功能层 (features/wall/)** 组合领域逻辑和 React/Canvas，负责 UI 渲染和用户交互。

## 编码约定

- y 轴：单元格坐标向上递增，世界坐标向下为正。需要显式转换，不应在二者之间混用。
- 坐标键：`coordKey` 生成 `"x:y"` 格式字符串用于比较和查找。
- 内容写入：所有写入必须经过 `prepareCellWrite` 做归一化和前端校验（空内容、超限、占用）。
- 封面标题：从正文第一行自动提取，无正文时使用类型兜底标题（"未命名文字" 等）。
- 动画：坐标跳转使用 `easeInOutCubic` 曲线，时长 `JUMP_ANIMATION_MS = 620ms`。
- 注释：所有公共函数需要完整的方法注释，说明用途、参数、返回值、副作用和边界条件。

## 相关文档

- `docs/adr/0001-use-nextjs-postgresql-prisma.md` — 技术方案选型决策
- `docs/agents/issue-tracker.md` — Issue 追踪配置
- `docs/agents/triage-labels.md` — 分诊标签配置
- `docs/agents/domain.md` — 领域文档读取规则
