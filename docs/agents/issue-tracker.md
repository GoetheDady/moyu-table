# Issue tracker：GitHub

本仓库的 Issue 和 PRD 使用 GitHub Issues 跟踪，仓库地址是 `git@github.com:GoetheDady/moyu-table.git`。

术语解释：

- Issue：需要跟踪的任务、缺陷、需求或问题。
- PRD：Product Requirements Document，产品需求文档，用来说明一个功能为什么要做、做什么、验收标准是什么。
- GitHub Issues：GitHub 提供的任务和问题跟踪功能，适合记录需求、缺陷、讨论和验收标准。
- `gh` CLI：GitHub 官方命令行工具。CLI 是 Command Line Interface，意思是命令行界面，可以在终端里创建、查看和更新 GitHub Issue。

## 约定

- 创建 Issue：使用 `gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- 读取 Issue：使用 `gh issue view <number> --comments`，必要时同时查看 labels。
- 列出 Issue：使用 `gh issue list --state open --json number,title,body,labels,comments`，根据需要增加 `--label` 和 `--state` 过滤。
- 评论 Issue：使用 `gh issue comment <number> --body "..."`
- 添加或移除标签：使用 `gh issue edit <number> --add-label "..."` 或 `--remove-label "..."`
- 关闭 Issue：使用 `gh issue close <number> --comment "..."`

在本仓库目录中运行 `gh` 命令时，`gh` 会根据 `git remote -v` 自动推断 GitHub 仓库。

## 当技能说 “publish to the issue tracker”

创建一个新的 GitHub Issue。

## 当技能说 “fetch the relevant ticket”

运行 `gh issue view <number> --comments` 读取对应 Issue。
