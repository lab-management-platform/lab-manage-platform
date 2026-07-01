# 模块划分与文件映射

适用对象：维护者、接入开发者、代码审查者  
更新时间：2026-07-01  
关联文档：[仓库层次结构](./repository-tree.md)、[系统架构](./system-architecture.md)

## 1. 顶层模块

| 模块 | 路径 | 职责 |
| --- | --- | --- |
| API 宿主 | `apps/api` | 认证、审计适配器初始化，插件注册与 HTTP 暴露 |
| Web 前端 | `apps/web` | 页面、布局、交互、数据拉取 |
| 核心能力 | `packages/core` | 认证、权限、事件、审计、插件契约 |
| 共享契约 | `packages/contracts` | OpenAPI 与共享导出 |
| 业务插件 | `plugins/*` | 项目、耗材、文件、协作、AI 等业务实现 |

## 2. API 宿主关键文件

| 文件 | 说明 |
| --- | --- |
| `apps/api/src/main.ts` | Fastify 路由装配、认证入口、SSE 事件入口 |
| `apps/api/src/kernel.ts` | 注册全部插件 |
| `apps/api/src/adapters.ts` | 审计、日志等适配器 |
| `apps/api/src/migrate.ts` | 数据库迁移入口 |

## 3. 前端关键文件

| 文件 / 目录 | 说明 |
| --- | --- |
| `apps/web/src/components/App.tsx` | 登录态与页面装配入口 |
| `apps/web/src/components/layout/` | `Sidebar`、`Topbar` 等应用壳层 |
| `apps/web/src/components/pages/` | 各业务页面 |
| `apps/web/src/components/projects/` | 项目树工作台、身份检索组件 |
| `apps/web/src/hooks/useLabData.ts` | 前端核心数据读写入口 |
| `apps/web/src/config/navigation.ts` | 导航与可见性配置 |
| `apps/web/src/types/index.ts` | 前端共享类型 |
| `apps/web/src/styles.css` | 全局样式 |

## 4. 插件与对应文件

| 插件 | 入口文件 | 主要职责 |
| --- | --- | --- |
| `hello-world` | `plugins/hello-world/src/index.ts` | 示例、健康验证 |
| `inventory` | `plugins/inventory/src/index.ts` | 耗材与库存 |
| `files` | `plugins/files/src/index.ts` | 文件资料与版本 |
| `collaboration` | `plugins/collaboration/src/index.ts` | 会议、通知、公告 |
| `ai` | `plugins/ai/src/index.ts` | 知识库、聊天、FAQ |
| `projects` | `plugins/projects/src/index.ts` | 项目主轴、任务、成员、项目树、汇报 |

## 5. 当前主干关系

最重要的业务依赖不是代码依赖，而是业务主线依赖：

- `projects` 定义项目与成员
- `inventory` 用 `project_id` 关联申请语义
- `files` 用 `project_id / report_id / file_kind` 关联资料语义
- `collaboration` 用 `project_id` 关联会议和通知
- `ai` 通过知识库和项目资料形成辅助能力
