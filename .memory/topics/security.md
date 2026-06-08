# Security Baseline

## VOR 高风险面

- 外部视频 URL 解析和下载存在 SSRF 风险。
- 图片、上传文件、MinIO 资源涉及文件类型和大小校验。
- 管理端 Lineup 隐藏、举报处理、用户数据访问必须做 AuthZ。
- `.env` 和 API Key 不允许被读取、输出或硬编码。

## 审查规则

- SQL 使用 SQLAlchemy 表达式和值绑定。
- 用户输入 URL 默认不可信，拒绝 localhost、metadata、内网地址，以及 `9.*`、`10.*`、`11.*`、`21.*`、`30.*`。
- 上传必须限制大小、MIME、扩展名，并避免无上限整体读入内存。
- 前端不使用未净化 HTML，不泄露 localStorage token。
