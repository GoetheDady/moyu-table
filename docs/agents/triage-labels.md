# Triage Labels

这些技能使用五个标准分诊角色。本文件把这些角色映射到本仓库实际使用的标签字符串。

术语解释：

- Triage：分诊，意思是把一个 Issue 判断为当前应该处于哪种处理状态。
- Label：标签，用来标记 Issue 的状态或类别。
- AFK-ready：Away From Keyboard ready，表示信息已经足够完整，agent 可以在没有额外人工上下文的情况下处理。

| mattpocock/skills 中的标签 | 本仓库使用的标签 | 中文说明 |
| -------------------------- | ---------------- | -------- |
| `needs-triage`             | `needs-triage`   | 需要维护者评估和整理 |
| `needs-info`               | `needs-info`     | 等待提问者补充信息 |
| `ready-for-agent`          | `ready-for-agent` | 信息完整，AI agent 可以独立处理 |
| `ready-for-human`          | `ready-for-human` | 需要人类开发者处理 |
| `wontfix`                  | `wontfix`        | 决定不处理 |

当技能提到某个分诊角色时，使用上表中“本仓库使用的标签”这一列对应的字符串。
