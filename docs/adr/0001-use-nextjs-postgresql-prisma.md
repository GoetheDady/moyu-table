# ADR 0001: 使用 Next.js + PostgreSQL + Prisma 作为目标技术方案

## 状态

Accepted

## 背景

moyu-table 的目标是提供一个上班摸鱼时可以闲逛、写想法、记笔记，也能偶尔当树洞用的无限格子墙。

当前版本是 Vite + React + TypeScript 的前端单页应用，已经具备 Canvas 透视网格、拖拽缩放、坐标跳转、写入格子和阅读格子的基础体验。

后续产品需要接入数据库，以支持：

- 格子内容持久化。
- 坐标唯一占用。
- 范围查询当前视口内的格子。
- 匿名身份、我的格子和收藏。
- 单个格子的分享页。
- 后续可能的图片、涂鸦和轻互动。

团队已有云服务器和 PostgreSQL，因此不需要额外引入 Supabase 作为后端平台。

PostgreSQL 是关系型数据库，适合保存坐标、内容类型、作者、收藏和时间等结构化数据。Supabase 是基于 PostgreSQL 的后端云平台，提供登录、存储、实时订阅和管理面板；本项目第一阶段不需要为了这些能力额外自托管 Supabase。

## 决策

目标技术方案采用：

- Next.js App Router。
- PostgreSQL。
- Prisma。
- Canvas 客户端渲染。

Next.js 用于承载页面、后端接口和后续分享页。

PostgreSQL 用于保存格子、坐标、内容、匿名身份和收藏等数据。

Prisma 用于在 TypeScript 代码中读写 PostgreSQL。Prisma 是 ORM，ORM 指“对象关系映射工具”，可以用类型安全的方式操作数据库表，减少手写 SQL 的重复工作。

Canvas 继续作为无限格子墙的核心渲染方式。Canvas 是浏览器提供的绘图画布，适合绘制大量网格、透视格子和视觉效果。

## 结果

正向影响：

- Next.js 可以同时承载前端页面和后端接口，便于后续接入数据库。
- App Router 支持分享页和服务端渲染，适合后续做 `/cell/[x]/[y]` 这类格子详情页。
- PostgreSQL 可以通过唯一约束保证同一个坐标只能被一个格子占用。
- Prisma 与 TypeScript 配合好，适合当前团队偏好的开发方式。
- Canvas 主体验可以保留，不需要为了迁移框架重写核心交互。

负向影响：

- 从 Vite 迁移到 Next.js 会产生一次项目结构调整。
- Prisma 会引入 schema、migration 和生成客户端等额外流程。
- Next.js 的 Server Component 和 Client Component 需要明确区分，Canvas 相关代码必须保留在 Client Component 中。

## 不选择的方案

### 继续 Vite + 独立后端

这个方案可行，但项目后续需要分享页、接口和数据库访问。Next.js 可以把这些能力放在同一个仓库和框架里维护，因此更符合当前目标。

### Supabase

Supabase 可以快速提供数据库、登录、存储和实时能力，但团队已有 PostgreSQL 和云服务器。第一阶段直接使用 PostgreSQL 更简单，也避免额外自托管 Supabase 的维护成本。

### Drizzle

Drizzle 更贴近 SQL，适合轻量和范围查询，但团队明确选择 Prisma。Prisma 文档和生态成熟，上手成本更低，符合当前偏好。

## 后续调整条件

如果未来出现以下情况，可以重新评估：

- Prisma 在复杂范围查询或性能调优上明显受限。
- 部署环境对 Prisma Client 或数据库连接数有明显限制。
- 产品需要强实时能力、对象存储和内建认证，并希望统一交给平台管理。
- 项目拆分为多端客户端，需要独立后端服务承载更多业务逻辑。
