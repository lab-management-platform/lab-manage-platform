# 实验室管理平台

实验室管理平台是一个面向高校实验室的项目制协作系统，以“项目 / 课题组”为主线串联账号权限、项目管理、耗材管理、文件资料、会议通知和 AI 助手。当前仓库采用 Monorepo 结构，后续跨组整合将以本仓库为主干进行能力扩展或重构。

## 项目定位

- 面向对象：高校实验室、课题组、实验项目成员
- 业务主线：项目管理驱动耗材、资料、会议和 AI 协作
- 工程目标：用微内核 + 插件化结构承接不同模块和不同技术组的整合

## 技术栈概览

- 前端：React 19 + TypeScript + Vite 6
- 后端：Fastify + TypeScript
- 数据库：PostgreSQL 16
- 工程：pnpm workspace Monorepo
- 部署：Docker Compose
- 测试：Vitest + Playwright smoke

## 快速启动

### 1. 准备环境

- Node.js 20.11+
- `corepack`
- Docker Desktop

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

默认地址：

- Web：`http://localhost:5173`
- API：`http://localhost:3000`
- Health：`http://localhost:3000/health`

### 2. 演示账号

```text
实验室管理员：admin / Admin@123456
教授：professor / Professor@123456
学生：student001 / Student@123456
```

### 3. 常用命令

```powershell
corepack pnpm run ci
corepack pnpm typecheck
corepack pnpm --filter @lab/web build
docker compose logs -f web
docker compose logs -f api
docker compose exec api pnpm --filter @lab/api db:migrate
```

## 文档入口

完整文档中心见 [docs/README.md](./docs/README.md)。

建议阅读顺序：

1. [项目总览](./docs/00-overview/project-overview.md)
2. [项目需求文档](./docs/01-product/product-requirements.md)
3. [系统架构](./docs/02-architecture/system-architecture.md)
4. [数据库设计](./docs/03-data/database-design.md)
5. [API 总览](./docs/04-api/api-overview.md)
6. [开发指南](./docs/05-engineering/development-guide.md)

## 目录概览

```text
lab-management-platform-migrate-temp/
├── apps/        API 宿主与 Web 前端
├── docs/        分层项目文档中心
├── infra/       Nginx / PostgreSQL 基础设施配置
├── packages/    核心能力与共享契约
├── plugins/     业务插件
└── scripts/     辅助脚本
```

## 当前说明

- 当前业务实现以 `projects` 插件为主轴
- 项目树、结构化汇报、项目资料与知识库上传能力已落地
- 文档中会明确区分“当前实现”和“契约待补齐”的部分，便于后续跨组整合时识别重构点
