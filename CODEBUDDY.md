# CODEBUDDY.md

本项目是 Valorant Lineup 知识平台：前端负责浏览、投稿、矫正和管理交互；后端负责鉴权、Lineup、上传、视频下载与帧抽取、存储。

## 技术栈

- 前端：Next.js 14、React 18、TypeScript、Tailwind CSS、React Query、Zustand。
- 后端：FastAPI、SQLAlchemy async、Alembic、PostgreSQL、Redis、MinIO。
- 本地依赖服务：`docker compose up -d postgres redis minio`。

## 不可破坏的边界

- 不要修改生成物和运行数据：`storage/`、`frontend/.next/`、`node_modules/`、`__pycache__/`、`*.pyc`。
- 不要读取、输出或写入真实密钥；配置只能走环境变量和 `.env.example` 示例。
- 用户可见下拉选择器必须使用 `frontend/components/dropdown.tsx` 的 `Dropdown`，禁止新增原生 `<select>` / `<option>`。
- 后端数据库结构变更必须同时提供 Alembic migration，不能只改 model。
- API 字段变更必须同步 `frontend/lib/api.ts` 类型、调用方和后端 schema。
- 新增外部 URL 请求、视频解析、图片代理等能力时，必须先设计 SSRF 防护。

## 安全底线

- SQL：只用 SQLAlchemy 参数绑定/表达式，不拼接用户输入。
- AuthZ：修改、隐藏、删除、管理操作必须校验用户身份和管理员权限/资源归属。
- XSS：前端不使用未净化的 `dangerouslySetInnerHTML`；服务端返回用户输入按文本处理。
- SSRF：用户输入 URL 默认不可信；拒绝 localhost、metadata、内网地址，以及 `9.*`、`10.*`、`11.*`、`21.*`、`30.*` 网段。
- 上传：限制大小、类型和扩展名；不要整文件无上限读入内存。
- Secrets：生产 `SECRET_KEY`、API Key、数据库密码必须来自环境变量。

## 前端规则

- 页面在 `frontend/app/`，可复用组件在 `frontend/components/`，业务 API 封装在 `frontend/lib/`。
- 组件使用 Functional Components + Hooks；不要使用 class 组件。
- 表单提交需要 `FormData` 时，`Dropdown` 必须传 `name`。
- 受控联动用 `value` + `onValueChange`，不要绕过组件内部状态。
- API 请求走 `apiFetch` / 既有服务封装，不在页面里重复拼接 base URL。
- 类型优先复用 `frontend/lib/api.ts`，避免 `any`。

## 后端规则

- 路由在 `backend/app/api/`，schema 在 `backend/app/schemas/`，CRUD 在 `backend/app/crud/`，业务逻辑在 `backend/app/services/`。
- 异步数据库操作使用 `AsyncSession`，事务边界要清晰。
- 所有外部服务调用设置超时、错误分类和日志；不要吞异常。
- 新增枚举值时同步 `app/enums.py`、前端 labels。



## 常用检查

优先使用项目 Harness：

```bash
bash .codebuddy/hooks/harness-check.sh
```

分层检查：

```bash
cd frontend && npm run typecheck && npm run lint
cd backend && python3 -m ruff check app
```


最短启动方式：Docker 一把起整个项目：

bash
cd /Users/zakikizou/CodeBuddy/vor-pro

# 如果还没有 .env
cp .env.example .env

# 起 postgres / redis / minio / backend api / frontend web
docker compose --profile app up --build
访问：

bash
前端：http://localhost:2367
后端：http://localhost:8000
MinIO 控制台：http://localhost:9001
如果你想本地开发分开起：

bash
cd /Users/zakikizou/CodeBuddy/vor-pro
docker compose up -d postgres redis minio
后端：

bash
cd /Users/zakikizou/CodeBuddy/vor-pro/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
前端另开终端：

bash
cd /Users/zakikizou/CodeBuddy/vor-pro/frontend
npm install
npm run dev
注意：backend/pyproject.toml 要求 Python >=3.11，你刚才用的是 3.10.13，建议后端用 python3.11。
如果本机依赖缺失，先说明缺失项，不要用临时脚本绕过检查。

## 小程序本地开发（重要：必须 HTTPS）

微信小程序 `<image>` 组件从某次基线起直接拒绝 HTTP 源（不是域名校验问题，DevTools 勾"不校验合法域名"也拦不住），本地后端必须起 HTTPS。

后端用脚本起 HTTPS：

bash
cd /Users/zakikizou/CodeBuddy/vor-pro
bash scripts/dev-backend-https.sh
# 首次运行会自动调用 backend/scripts/generate-dev-cert.sh 生成自签证书
# 监听 https://localhost:8443
小程序侧：
1. `miniprogram/.env.example` 复制为 `.env`（按需改 `TARO_APP_API_BASE_URL`，默认 `https://localhost:8443/api`）
2. `miniprogram/project.config.json` 里 `urlCheck: false`（自签证书需要）
3. 微信开发者工具 → 详情 → 本地设置 → 勾选"不校验合法域名"
4. 启动后 `https://localhost:8443/healthz` 应返回 `{"status":"ok"}`

真机预览：自签证书不会被系统信任，必须用备案域名 + 正式证书，或临时关闭小程序后台的 request 域名校验。
