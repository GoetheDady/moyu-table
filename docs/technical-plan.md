# 技术方案

本文记录 moyu-table 的目标技术架构和阶段性实现方案。

## 背景

moyu-table 是一个上班摸鱼时可以闲逛、写想法、记笔记，也能偶尔当树洞用的无限格子墙。

产品核心体验有三点：

- 逛：用户可以拖拽、缩放、随机或按坐标探索格子墙。
- 写：用户可以把随想、笔记、提问或树洞内容写入一个空格子。
- 看：用户可以点开已有格子阅读内容，并在后续通过坐标、收藏或个人记录回访。

当前实现是 Vite + React + TypeScript 的前端单页应用。单页应用指主要交互都在一个浏览器页面里完成，不依赖频繁页面跳转。

后续接入数据库后，项目需要承接格子持久化、坐标唯一、收藏、匿名身份、分享页和可能的图片内容。因此目标方案选择 Next.js + PostgreSQL + Prisma。

## 总体架构

目标架构：

```text
Next.js App Router
  -> Client Component 无限格子墙
  -> Route Handler 后端接口
  -> Prisma 数据访问
  -> PostgreSQL 数据库
```

App Router 是 Next.js 当前主推的路由体系，用 `app/` 目录组织页面、布局和接口。

Client Component 是运行在浏览器里的 React 组件。无限格子墙依赖 Canvas、鼠标事件和滚轮事件，因此必须保留为 Client Component。

Route Handler 是 Next.js 的后端接口文件，通常写在 `app/api/**/route.ts`，用于处理读取格子、写入格子、收藏等请求。

Prisma 是 ORM。ORM 指“对象关系映射工具”，作用是让 TypeScript 代码用类型安全的方式操作数据库表。

PostgreSQL 是关系型数据库，适合保存格子坐标、内容类型、作者、收藏和时间等结构化数据。

## 分层设计

建议按四层组织代码：

```text
app/
  page.tsx
  api/
    cells/route.ts
  cell/[x]/[y]/page.tsx

src/
  domain/
    cells/
  features/
    wall/
  data/
  lib/

prisma/
  schema.prisma
  migrations/
```

### 渲染层

渲染层负责 Canvas 绘制和界面展示，包括透视网格、格子封面、hover 高亮、阅读面板和写入面板。

Canvas 是浏览器提供的绘图画布，适合直接绘制大量网格线、投影格子和视觉效果。DOM 则继续用于按钮、表单、浮层等普通界面元素。DOM 指浏览器中的普通网页节点，例如 `div`、`button`、`textarea`。

### 交互层

交互层负责拖拽、缩放、坐标跳转、点击选择和写入流程。

这里应该继续保留纯函数，方便测试坐标转换、拖拽状态、缩放锚点和点击判定。

### 领域层

领域层负责业务规则。

业务规则包括：

- 坐标必须是整数。
- 一个公开格子只能占用一个坐标。
- 内容不能为空。
- 内容长度不能超过限制。
- 内容类型只能来自允许集合。
- 封面可以从内容自动生成，也可以后续被手动配置覆盖。

领域层不应该依赖 React、Next.js 或 Prisma。这样可以保持规则稳定，后续迁移前端或数据库时不用重写核心规则。

### 数据层

数据层负责隐藏数据库和接口细节。

建议引入 `cellRepository` 这类模块。Repository 可以理解为“数据仓库模块”，它把“读取某个范围的格子”“写入一个格子”“读取单个格子”等操作封装起来，让页面和组件不用关心底层是 demo 数据、API 还是 PostgreSQL。

## 数据模型

第一版核心模型是 `Cell`。

```prisma
model Cell {
  id        String   @id @default(cuid())
  x         Int
  y         Int
  type      CellType @default(THOUGHT)
  title     String?
  content   String
  authorId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([x, y])
  @@index([x, y])
  @@index([createdAt])
}

enum CellType {
  THOUGHT
  NOTE
  QUESTION
  TREE_HOLE
}
```

`@@unique([x, y])` 是唯一约束。唯一约束指数据库保证同一个坐标只能出现一条记录，即使两个人同时写入，也不能生成重复格子。

`@@index` 是数据库索引。索引用来加速查询，例如按坐标范围读取可见格子，或按创建时间读取最新格子。

## API 设计

第一版建议先做两个接口：

```text
GET /api/cells?minX=-20&maxX=20&minY=-10&maxY=15
POST /api/cells
```

`GET /api/cells` 用于读取当前视口范围内的格子。视口指用户当前屏幕能看到的世界范围。

`POST /api/cells` 用于写入一个新格子。服务端需要校验参数、检查内容限制，并依赖数据库唯一约束处理坐标冲突。

接口参数建议用 Zod 校验。Zod 是 TypeScript 常用的数据校验库，用来确认接口收到的字段类型和边界条件正确，例如 `x` 必须是整数、`content` 不能为空。

## 读取策略

无限格子墙不应该一次加载全部数据。

客户端应根据当前相机、缩放和屏幕尺寸计算可见坐标范围，然后按范围请求格子数据。拖拽和缩放后，只加载新的可见区域或附近区域。

后续可以引入 TanStack Query 管理请求缓存。缓存指已经请求过的数据暂时保存在前端，用户拖回相同区域时可以少发请求。

## 写入策略

写入流程：

```text
点击空格子
输入内容
提交到 POST /api/cells
服务端校验内容和坐标
Prisma 写入 PostgreSQL
数据库唯一约束保证坐标不重复
前端刷新该坐标所在区域
```

如果数据库返回唯一约束冲突，界面应该提示“这个格子已经被占用”。这种情况可能发生在多人同时写入同一个坐标时。

## 身份方案

第一版先使用匿名身份。

匿名身份指浏览器保存一个随机 ID，服务端通过 Cookie 识别同一个设备或浏览器。Cookie 是浏览器保存的小段数据，服务端也能读取，适合保存匿名用户 ID。

后续如果需要跨设备同步“我的格子”和收藏，再接正式登录。

## 暂不优先做

第一阶段不优先做：

- 复杂评论系统。
- 完整治理后台。
- 实时多人协同编辑。
- 重型富文本编辑器。
- 复杂推荐算法。

治理功能指举报、审核、封禁、敏感内容处理等社区管理能力。它们适合在公开用户量上来之后再规划。

推荐算法指系统自动判断用户应该看到什么内容。第一版先用最新、随机、附近、热门坐标等简单规则。

## 迁移步骤

建议按以下顺序迁移：

1. 新建 Next.js App Router 结构。
2. 把当前 Canvas 格子墙迁移为 `WallClient` Client Component。
3. 保留 demo 数据，先跑通 Next.js 页面。
4. 把坐标、封面、写入校验等规则移动到 `src/domain/cells`。
5. 引入 Prisma，创建 `Cell` 模型和数据库迁移。
6. 实现 `GET /api/cells` 和 `POST /api/cells`。
7. 前端从 demo 数据切换到接口数据。
8. 增加匿名身份、我的格子、收藏和分享页。

## 核心原则

- 格子墙主体验保留在客户端 Canvas。
- Next.js 负责页面结构、后端接口、分享页和数据连接。
- PostgreSQL 负责坐标唯一和持久化。
- Prisma 负责类型安全的数据访问。
- 领域规则尽量不依赖框架，保持可测试和可迁移。
