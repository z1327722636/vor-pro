# Harness

## 当前约定

- 项目规则入口是 `CODEBUDDY.md`。
- CodeBuddy Hook 配置在 `.codebuddy/settings.json`。
- 统一质量入口是 `bash .codebuddy/hooks/harness-check.sh`。
- 常用命令在 `.codebuddy/commands/`：`/check`、`/git`、`/security-review`、`/context-refresh`。
- 专属角色在 `.codebuddy/agents/`：前端、后端、ML、测试、安全和 reviewer。

## 使用经验

- 先用规则和检查收窄 AI 行为，再让 agent 写代码。
- 涉及跨层契约时，前后端类型、schema、model、migration 必须一起看。
- reviewer 默认只审查不修改，避免审查角色绕过工程师职责边界。
