---
allowed-tools: Bash(bash .codebuddy/hooks/harness-check.sh:*)
argument-hint: [scope]
description: 运行项目 Harness 质量检查
---

运行项目统一检查：

```bash
bash .codebuddy/hooks/harness-check.sh
```

如果失败：
1. 先定位根因，不要绕过检查。
2. 前端原生 `<select>` / `<option>` 必须替换为 `Dropdown`。
3. 类型、lint、ruff 问题按所属层修复。
4. 修复后再次运行本命令。
