# 实验室管理平台

实验室管理平台是一个面向高校实验室的项目制协作系统，以“项目 / 课题组”为主线串联账号权限、项目管理、物资管理、文件资料、会议通知和 AI 助手。当前仓库采用 Monorepo 结构，后续跨组整合将以本仓库为主干进行能力扩展或重构。

## 项目定位

- 面向对象：高校实验室、课题组、实验项目成员
- 业务主线：项目管理驱动物资、资料、会议和 AI 协作
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

完整中文文档中心见 [docs/项目文档/文档中心.md](./docs/项目文档/文档中心.md)。旧版文档已移动到 [docs/归档](./docs/归档)。

建议阅读顺序：

1. [项目总览](./docs/项目文档/01-项目总览.md)
2. [需求与范围](./docs/项目文档/02-需求与范围.md)
3. [功能设计](./docs/项目文档/03-功能设计.md)
4. [角色与权限](./docs/项目文档/04-角色与权限.md)
5. [技术架构](./docs/项目文档/05-技术架构.md)
6. [数据库设计](./docs/项目文档/06-数据库设计.md)
7. [接口与数据契约](./docs/项目文档/08-接口与数据契约.md)
8. [进度与验收](./docs/项目文档/10-进度与验收.md)

## 目录概览

```text
lab-management-platform-migrate-temp/
├── apps/        API 宿主与 Web 前端
├── docs/        中文项目文档与历史归档
├── infra/       Nginx / PostgreSQL 基础设施配置
├── packages/    核心能力与共享契约
├── plugins/     业务插件
└── scripts/     辅助脚本
```

## 当前说明

- 当前业务实现以 `projects` 插件为主轴
- 项目树、结构化汇报、项目资料与知识库上传能力已落地
- 文档中会明确区分“当前实现”和“契约待补齐”的部分，便于后续跨组整合时识别重构点
