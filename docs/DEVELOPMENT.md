# 开发指南

## 1. 环境要求

- Node.js 20+
- pnpm 9+
- Docker Desktop

推荐优先使用 Docker 开发环境，避免本机单独安装 PostgreSQL。

检查命令：

```powershell
node -v
corepack pnpm --version
docker version
docker compose version
```

## 2. 本地启动

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

常用辅助命令：

```powershell
docker compose logs -f api
docker compose logs -f web
docker compose exec api pnpm --filter @lab/api db:migrate
```

## 3. 当前代码结构

### 前端 `apps/web`

当前前端已从旧的一页式长工作台重构为模块化结构：

```text
apps/web/src/
├── components/
│   ├── layout/           应用壳层：Sidebar / Topbar
│   ├── pages/            模块页：Dashboard / Projects / Inventory ...
│   ├── shared/           共享 UI 组件
│   ├── App.tsx           页面装配与登录态入口
│   └── LoginForm.tsx     登录与找回密码
├── config/               导航与角色可见性配置
├── hooks/                数据加载与业务动作
├── types/                前端类型
├── utils/                文本、状态、格式化工具
└── styles.css            全局样式
```

### 后端 `apps/api`

```text
apps/api/src/
├── main.ts        HTTP 路由与服务启动
├── kernel.ts      微内核装配与插件注册
├── adapters.ts    审计、日志等适配器
└── migrate.ts     数据库迁移入口
```

### 核心与插件

- `packages/core`: 认证、权限、审计、事件、插件契约
- `packages/contracts`: OpenAPI 与共享契约
- `plugins/inventory`: 耗材、申请、审批、库存流水
- `plugins/files`: 文件资料、版本、权限
- `plugins/collaboration`: 会议、通知、公告
- `plugins/ai`: AI 对话、知识库、FAQ
- `plugins/projects`: 项目、任务、成员、进度

## 4. 开发规则

- 插件不能直接导入其他插件源码
- 插件不能直接读写其他插件的 schema
- 新增 API 时同步更新 OpenAPI
- 重要写操作要记录审计日志
- UI 列表避免无限增长，优先使用筛选、分页、局部滚动或“查看更多”
- 不提交 `.env`、证书、密码、NAS token

## 5. 新增业务插件流程

1. 创建 `plugins/<name>/`
2. 补 `package.json`、`tsconfig.json`、`src/index.ts`
3. 在 `apps/api/package.json` 添加 workspace 依赖
4. 在 `apps/api/src/kernel.ts` 注册插件
5. 在根 `tsconfig.json` 和 API `tsconfig.json` 添加引用
6. 更新 `packages/contracts/openapi/core-api.yaml`
7. 如需数据表，添加 migration 或初始化逻辑
8. 跑 `corepack pnpm run ci`

插件模板参考：[plugin-template.md](./plugin-template.md)

## 6. 质量检查

提交前执行：

```powershell
corepack pnpm run ci
```

它会检查：

- Prettier
- ESLint
- TypeScript
- Vitest
- 构建

## 7. 常见问题

### Docker 命令找不到

- 确认 Docker Desktop 已启动
- 重开终端
- 检查 Docker 的 `resources\bin` 是否在 `Path` 中

### 容器里依赖没刷新

```powershell
docker compose up --build -d -V api web
```

### Windows 下前端包解析异常

仓库当前在部分 Windows 环境里会遇到 `pnpm` 链接结构解析不稳定。优先使用 Docker 开发，必要时先跑：

```powershell
corepack pnpm --filter @lab/web typecheck
```
