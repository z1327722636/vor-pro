---
allowed-tools: Read, Grep, Glob, Bash(bash .codebuddy/hooks/harness-check.sh:*)
argument-hint: [changed-files-or-scope]
description: 按项目安全底线审查改动
---

围绕指定范围做安全审查，重点检查：

- SQLi：是否拼接用户输入。
- AuthZ：是否校验管理员权限或资源归属。
- SSRF：外部 URL、视频解析、图片代理是否拒绝内网和特殊网段。
- XSS：是否引入未净化 HTML。
- 上传：是否限制大小、类型、扩展名和内存占用。
- Secrets：是否读取、输出或硬编码密钥。
- 下拉组件：用户可见选择器是否使用 `Dropdown`。

输出按「风险 / 证据 / 修复建议」组织；不要直接改代码，除非用户要求。
