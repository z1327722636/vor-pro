# vor-pro PC + 小程序上线备案发布清单

## 1. 本次工程交付范围

- PC Web：保留现有 `frontend` Next.js 系统，继续承担投稿、视频解析、图片标注、账户与后台管理。
- 小程序：新增 `miniprogram` Taro React 工程，首版支持首页、点位列表、筛选、详情、微信登录、点赞、收藏。
- 后端：复用 FastAPI API，新增小程序登录接口，统一使用 JWT 鉴权。
- 发布：提供工程配置与检查清单；ICP备案、公安备案、微信小程序认证/审核必须由主体账号所有人完成。

## 2. 必须由你提供/确认的资料

| 类别 | 必需资料 | 说明 |
| --- | --- | --- |
| 域名 | 已实名域名 | 小程序 request 合法域名和 PC 站点域名必须 HTTPS |
| ICP 备案 | 主体证件、负责人证件、手机号、云服务商备案码 | 备案通过前一般不能正式对外开放 |
| 公安备案 | ICP 备案号、网站负责人信息、服务器信息 | ICP 通过后 30 日内办理 |
| 小程序 | 微信小程序账号、AppID、类目、认证资质 | 涉游戏内容需谨慎选择类目并准备审核说明 |
| 服务器 | 云服务器/容器服务、PostgreSQL、Redis、对象存储 | 生产不建议使用本地 MinIO 暴露公网 |
| 密钥 | `SECRET_KEY`、微信 `APPID/SECRET`、对象存储密钥 | 只能写入生产环境变量，禁止提交仓库 |
| 法务 | 用户协议、隐私政策、内容审核规则 | 小程序审核和备案均可能要求 |

## 3. 生产环境变量

后端 `.env` 至少需要：

```bash
APP_ENV=production
FRONTEND_ORIGIN=https://你的PC域名
SECRET_KEY=替换为强随机值
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
MINIO_ENDPOINT=对象存储内网或公网Endpoint
MINIO_PUBLIC_ENDPOINT=对象存储访问域名
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=lineup-assets
MINIO_SECURE=true
WECHAT_APPID=小程序AppID
WECHAT_SECRET=小程序Secret
WECHAT_LOGIN_MOCK=false
```

小程序构建时指定：

```bash
TARO_APP_API_BASE_URL=https://你的API域名/api npm run build:weapp
```

## 4. 部署顺序

1. 准备云资源：服务器/容器、PostgreSQL、Redis、对象存储、HTTPS 证书。
2. 部署后端：安装依赖、配置环境变量、执行 Alembic migration、启动 API/Celery worker。
3. 部署 PC：在 `frontend` 执行构建并发布到 Web 服务或容器。
4. 配置反向代理：
   - `https://api.example.com/api/*` -> FastAPI
   - `https://www.example.com/*` -> Next.js
   - `/uploads`、`/frames` 或对象存储静态域名可访问。
5. 小程序构建：在 `miniprogram` 执行 `npm run build:weapp`，用微信开发者工具导入并上传。
6. 微信后台配置：request 合法域名、downloadFile 合法域名、业务域名、隐私接口说明。
7. 提审发布：填写版本说明、测试账号/测试路径、内容合规说明。

## 5. 发布前检查

| 检查项 | 标准 |
| --- | --- |
| HTTPS | PC、API、对象存储资源全站 HTTPS |
| 鉴权 | 收藏、点赞、投稿、管理接口必须要求登录 |
| CORS | 只允许生产 PC 域名和必要测试域名 |
| SSRF | 视频解析/外链解析拒绝 localhost、内网、metadata IP |
| 上传 | 限制大小、类���、扩展名；不要整文件无上限读入内存 |
| 日志 | 不打印 token、密钥、微信 session_key |
| 备案号 | PC 页面底部展示 ICP 备案号和公安备案号 |
| 隐私 | 小程序隐私政策与实际收集信息一致 |
| 审核 | 准备“点位攻略工具/用户生成内容审核机制”的说明 |

## 6. 当前不能代办的事项

- 不能替你完成 ICP 备案、公安备案、小程序企业/个人认证，因为需要真实主体资料和账号登录。
- 不能替你填写真密钥或读取线上密钥。
- 不能保证涉游戏内容一定通过小程序审核，需要根据账号主体、类目和内容表达调整。

## 7. 建议首版上线策略

- 首版小程序只开放浏览、筛选、详情、收藏和点赞，弱化“游戏/竞技”营销表达。
- 投稿、视频解析、图片标注先保留在 PC，避免小程序审核和移动端上传复杂度拉高。
- 上线前准备 10-20 条人工审核过的 Lineup 数据，避免空站提审。
