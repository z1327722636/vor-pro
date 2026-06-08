# Frontend Contract

## Dropdown

- 用户可见下拉必须使用 `frontend/components/dropdown.tsx` 的 `Dropdown`。
- 禁止新增原生 `<select>` / `<option>`。
- 表单提交场景给 `Dropdown` 传 `name`，由 hidden input 进入 `FormData`。
- 受控联动使用 `value` + `onValueChange`。

## API 类型

- API base URL 由 `frontend/lib/api.ts` 管理。
- Lineup、User、Step 等跨层类型优先在 `frontend/lib/api.ts` 维护。
- 后端 schema 变更后必须同步前端类型和调用方。
