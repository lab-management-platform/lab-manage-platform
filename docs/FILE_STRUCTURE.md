# 文件作用说明

这份文档说明项目中主要目录和文件的作用，方便开发组成员判断“我要改哪里”。

## 根目录

| 文件/目录                        | 作用                                     |
| -------------------------------- | ---------------------------------------- |
| `README.md`                      | 项目总入口，介绍能力、启动方式、文档入口 |
| `docs/DEVELOPMENT.md`            | 开发指南、分工、新增插件流程             |
| `docs/API.md`                    | 常用 API 说明                            |
| `docs/PROJECT_PROGRESS.md`       | 当前进度、已完成和待完成任务             |
| `docs/CONTRIBUTING.md`           | 协作规范、提交规范、PR 模板              |
| `docs/plugin-template.md`        | 新增插件模板                             |
| `docs/DEPLOYMENT.md`             | 生产部署、Nginx、HTTPS、迁移             |
| `docs/SYNOLOGY_DRIVE_ADAPTER.md` | NAS / Synology Drive 后续适配说明        |
| `package.json`                   | Monorepo 根脚本和开发依赖                |
| `pnpm-workspace.yaml`            | pnpm workspace 范围                      |
| `pnpm-lock.yaml`                 | 依赖锁文件                               |
| `Dockerfile`                     | 开发/生产镜像构建                        |
| `docker-compose.yml`             | 开发环境 Docker Compose                  |
| `docker-compose.prod.yml`        | 生产环境 Docker Compose                  |
| `.env.example`                   | 开发环境变量模板                         |
| `.env.production.example`        | 生产环境变量模板                         |
| `eslint.config.js`               | ESLint 配置                              |
| `.prettierrc.json`               | Prettier 配置                            |
| `tsconfig.json`                  | TypeScript 工程引用入口                  |
| `tsconfig.base.json`             | 共享 TypeScript 编译配置                 |

## apps

| 路径                       | 作用                                      |
| -------------------------- | ----------------------------------------- |
| `apps/api`                 | 后端 HTTP 宿主                            |
| `apps/api/src/main.ts`     | 创建 Fastify app，挂载核心 API 和插件路由 |
| `apps/api/src/kernel.ts`   | 创建微内核，注册插件                      |
| `apps/api/src/adapters.ts` | 日志、审计等基础适配器                    |
| `apps/api/src/migrate.ts`  | 数据库迁移入口                            |
| `apps/api/test`            | API 和内核测试                            |
| `apps/web`                 | 前端应用                                  |
| `apps/web/src/main.tsx`    | 当前主要前端页面和交互逻辑                |
| `apps/web/src/styles.css`  | 前端样式                                  |

## packages

| 路径                                       | 作用                               |
| ------------------------------------------ | ---------------------------------- |
| `packages/core`                            | 微内核代码                         |
| `packages/core/src/contracts.ts`           | 核心类型、插件契约、权限、审计接口 |
| `packages/core/src/auth.ts`                | 本地认证和 PostgreSQL 认证适配器   |
| `packages/core/src/kernel.ts`              | 插件生命周期和路由收集             |
| `packages/core/src/event-bus.ts`           | 内存事件总线                       |
| `packages/contracts`                       | 跨模块契约                         |
| `packages/contracts/openapi/core-api.yaml` | HTTP API OpenAPI 文档              |

## plugins

| 路径                    | 作用                                        |
| ----------------------- | ------------------------------------------- |
| `plugins/hello-world`   | 示例插件                                    |
| `plugins/ai`            | AI 智能问答、知识库、RAG 对话               |
| `plugins/collaboration` | 会议、公告、站内通知插件                    |
| `plugins/inventory`     | 耗材、申请审批、库存流水                    |
| `plugins/files`         | 文件资料、文件夹、权限、版本与 NAS 链接兼容 |

每个插件都应该独立维护：

- 自己的路由
- 自己的数据表 schema
- 自己的测试
- 自己的 OpenAPI 契约更新

## infra

| 路径                             | 作用                     |
| -------------------------------- | ------------------------ |
| `infra/postgres/init`            | 开发数据库首次初始化脚本 |
| `infra/postgres/migrations`      | 生产/升级迁移脚本        |
| `infra/nginx/default.conf`       | 生产 HTTP Nginx 配置     |
| `infra/nginx/https.example.conf` | HTTPS 示例配置           |

## 修改位置速查

| 需求         | 主要修改位置                                                        |
| ------------ | ------------------------------------------------------------------- |
| 新增后端接口 | 对应插件 `src/index.ts`、`packages/contracts/openapi/core-api.yaml` |
| 新增前端页面 | `apps/web/src/main.tsx`、`apps/web/src/styles.css`                  |
| 新增权限     | `packages/core/src/contracts.ts`、`packages/core/src/auth.ts`       |
| 新增插件     | `plugins/new-plugin`、`apps/api/src/kernel.ts`、`tsconfig.json`     |
| 新增数据表   | `infra/postgres/migrations`、插件 repository 初始化                 |
| 修改部署     | `Dockerfile`、`docker-compose.prod.yml`、`infra/nginx`              |
