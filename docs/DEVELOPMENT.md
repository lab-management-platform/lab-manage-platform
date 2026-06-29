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

首次启动或需要重建开发环境时：

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

### 2.1 命令用途与区别

#### `docker compose up --build -d`

- 作用：构建镜像并后台启动服务
- 适用场景：
  - 第一次启动仓库
  - 修改了 `Dockerfile`
  - 修改了 `docker-compose.yml`
  - 修改了 `package.json`、锁文件、依赖安装逻辑
  - 怀疑镜像层和当前代码状态已经不一致
- 特点：
  - 最完整、最重
  - 会花更多时间
  - 不适合作为“每次改前端文件后的刷新手段”

#### `docker compose ps`

- 作用：查看容器状态
- 适用场景：
  - 确认 `api`、`web`、`postgres` 是否都启动
  - 确认端口是否已暴露
  - 快速判断是不是服务根本没起来
- 特点：
  - 完全只读
  - 不会更新任何代码，也不会重启任何容器

#### `docker compose restart web`

- 作用：只重启前端容器
- 适用场景：
  - 修改了前端监听配置
  - 修改了 `docker-compose.yml` 中 `web` 的环境变量
  - 修改了 `apps/web/vite.config.ts`
  - 前端热更新异常，但不想整套重建
- 特点：
  - 比 `up --build -d` 轻很多
  - 适合让新的 Vite 配置或监听方式立刻生效

#### `docker compose logs -f web`

- 作用：实时查看前端开发服务日志
- 适用场景：
  - 确认 Vite 是否已启动
  - 排查热更新是否生效
  - 查看前端编译错误
- 正常情况下你会看到类似：
  - `VITE ready`
  - `Local: http://localhost:5173/`

#### `docker compose logs -f api`

- 作用：实时查看后端服务日志
- 适用场景：
  - 排查接口失败
  - 排查插件注册异常
  - 排查数据库连接问题

### 2.2 日常前端开发应该怎么做

- 修改 `apps/web/src/*`、`styles.css`、页面组件、hooks、layout`
  - 正常情况下应该由 Vite 自动热更新
  - 不需要 `docker build`
- 如果前端代码改了但浏览器没变化：
  1. 先运行 `docker compose ps`
  2. 再运行 `docker compose logs -f web`
  3. 若 `web` 正常运行但监听异常，执行 `docker compose restart web`
  4. 只有在镜像层或依赖变化时，才执行 `docker compose up --build -d`

### 2.3 当前仓库为什么通常不需要手动 build 前端

- `web` 服务运行的是 `pnpm --filter @lab/web dev --host 0.0.0.0`
- 这代表容器里启动的是 `Vite dev server`
- `Vite dev server` 的默认工作方式是：
  - 监听源码变化
  - 增量编译
  - 自动热更新到浏览器

也就是说：

- 改前端源码 = 应该热更新
- 改依赖/镜像/容器配置 = 可能需要 `restart web` 或 `up --build -d`

### 2.4 本机直跑前端的场景

如果你不想依赖 Docker 的文件监听，也可以直接在本机跑前端：

```powershell
corepack pnpm install
corepack pnpm --filter @lab/web dev
```

适用场景：

- Docker Desktop 在 Windows 下文件监听不稳定
- 只改前端页面，不涉及后端运行方式
- 想获得更快的热更新反馈

注意：

- 本机直跑前端时，浏览器仍访问 `http://localhost:5173`
- 后端接口仍可继续走 Docker 中的 `api` 服务

### 2.5 常用辅助命令

```powershell
docker compose logs -f api
docker compose logs -f web
docker compose restart web
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
