---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(bash .codebuddy/hooks/harness-check.sh:*)
argument-hint: [commit message]
description: 检查后按功能拆分提交
---

执行提交前必须先确认当前目录是 git 仓库：

```bash
git status --short
```

流程：
1. 查看 `git status --short` 和必要的 `git diff`，只提交与当前任务相关的改动。
2. 运行 `bash .codebuddy/hooks/harness-check.sh`。
3. 如果检查失败，先修复根因再提交。
4. 按功能拆分 commit，提交信息使用简洁中文或 conventional commit。
5. 禁止使用 `--no-verify`，除非用户明确要求。
