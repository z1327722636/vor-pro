---
description: Dropdown component usage rule for frontend forms and filters
globs: frontend/**/*.tsx
alwaysApply: true
---

# 下拉组件书写规则

## 强制要求

- 项目中所有用户可见的下拉选择器必须使用 `frontend/components/dropdown.tsx` 中的 `Dropdown` 组件。
- 禁止在页面、表单、筛选栏、弹窗等用户界面里新增或恢复原生 `<select>` / `<option>`。
- 修改已有表单或筛选逻辑时，必须先全文搜索当前改动范围内是否存在 `<select>`，发现后应替换为 `Dropdown`。
- 需要提交表单时，必须给 `Dropdown` 传 `name`，由组件内部 hidden input 参与 `FormData`。
- 需要受控联动时，必须使用 `value` + `onValueChange`；例如英雄切换后联动技能列表。
- 下拉菜单被遮挡时，优先检查父容器 `overflow` 和层级，不要回退到原生 `<select>`。

## 例外

只有在实现无样式后台调试页，且用户明确要求使用浏览器原生控件时，才允许使用 `<select>`。
