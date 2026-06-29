# 实验室管理平台 - 项目文档

> 版本: 2.0 | 最后更新: 2026-06-28

---

## 1. 项目简介

**实验室管理平台** 是一个面向高校实验室的 Web 应用，以"项目"为核心串联耗材管理、会议通知、文件资料、AI 问答等功能。采用微内核 + 插件化架构，Docker 容器化部署。

### 快速启动

```bash
cp .env.example .env
docker compose up -d --build
# 浏览器打开 http://localhost:5173
```

---

## 2. 技术架构

```
┌─────────────────────────────────────────────────────┐
│               前端 (apps/web)                        │
│  React 18 + TypeScript + Vite 6                     │
│  组件化: 8 个独立 Panel 组件                         │
│  状态管理: React Hooks (useState)                   │
│  样式: 原生 CSS (styles.css)                        │
├─────────────────────────────────────────────────────┤
│               后端 (apps/api)                        │
│  Fastify 5 + TypeScript                             │
│  微内核架构: Kernel 统一管理插件                      │
│  认证: JWT + 本地账号                                │
├──────────────┬──────────────┬───────────────────────┤
│ inventory    │ files        │ collaboration         │
│ 耗材管理     │ 文件资料     │ 会议通知              │
│ PostgreSQL   │ PostgreSQL   │ PostgreSQL            │
├──────────────┼──────────────┼───────────────────────┤
│ ai           │ projects     │ hello-world           │
│ AI 助手      │ 项目管理     │ 健康检查              │
│ pgvector     │ PostgreSQL   │ Fastify               │
└──────────────┴──────────────┴───────────────────────┘
│                                                      │
│          PostgreSQL 16 (Docker)                      │
│          Kernel (packages/core)                      │
│          认证 / 事件总线 / 审计日志                    │
└──────────────────────────────────────────────────────┘
```

## 3. 项目结构

```
lab-management-platform/
├── apps/
│   ├── api/                        # 后端入口
│   │   └── src/
│   │       ├── main.ts            # Fastify 路由注册
│   │       ├── kernel.ts          # 插件注册
│   │       └── adapters.ts        # 审计/日志适配器
│   └── web/                        # 前端入口
│       └── src/
│           ├── main.tsx           # 入口 (5行)
│           ├── styles.css         # 全局样式
│           ├── types/index.ts     # TS 类型定义
│           ├── utils/helpers.ts   # 工具函数
│           └── components/
│               ├── App.tsx        # 主应用 (状态+布局)
│               ├── LoginForm.tsx  # 登录+密码找回
│               ├── Sidebar.tsx    # 侧边栏(按角色)
│               ├── Shared.tsx     # Metric, ModuleCard
│               ├── InventoryPanel.tsx  # 库存+申请+流水
│               ├── FilePanel.tsx      # 文件+版本+上传
│               ├── MeetingPanel.tsx   # 会议+通知+公告
│               ├── AccountPanel.tsx   # 账户管理(5标签)
│               ├── AIPanel.tsx        # AI对话+知识库
│               └── ProjectsPanel.tsx  # 项目管理(新)
├── packages/
│   ├── core/                       # 微内核
│   │   └── src/
│   │       ├── contracts.ts       # 接口定义
│   │       ├── auth.ts            # 认证适配器
│   │       ├── kernel.ts          # 内核(插件管理)
│   │       └── event-bus.ts       # 事件总线
│   └── contracts/                  # 共享事件类型
├── plugins/                        # 功能插件
│   ├── inventory/                  # 耗材管理
│   ├── files/                      # 文件资料
│   ├── collaboration/              # 会议通知
│   ├── ai/                         # AI 助手
│   ├── projects/                   # 项目管理 (新增)
│   └── hello-world/               # 健康检查
├── scripts/
│   ├── vm-setup.sh                 # VM 一键配置
│   └── vm-manage.sh               # VM 管理工具
├── docs/
│   ├── REQUIREMENTS.md             # 需求文档
│   ├── PROJECT.md                  # 本文档
│   ├── PERMISSION_MATRIX.md       # 权限矩阵
│   └── VM_SETUP.md                 # VM 部署指南
├── docker-compose.yml              # 开发部署
├── docker-compose.prod.yml         # 生产部署
├── Dockerfile                      # 多阶段构建
└── .github/workflows/ci.yml       # CI/CD
```

## 4. 数据库设计

### 4.1 表结构总览

```
core                    inventory               files
├── app_user            ├── material            ├── lab_file
└── session             ├── application         └── file_version
                        └── stock_movement

collaboration           ai                      projects
├── meeting             ├── knowledge_document   ├── project
└── notification        ├── knowledge_embedding  ├── project_member (新)
                        ├── chat_history         ├── progress_report (新)
                        └── faq_template         ├── task
                                                 └── task_comment
```

### 4.2 关键表 - 用户

```sql
core.app_user
  id              TEXT PRIMARY KEY
  username        TEXT UNIQUE
  student_id      TEXT UNIQUE
  phone           TEXT UNIQUE
  password_hash   TEXT          -- SHA256
  display_name    TEXT
  role            TEXT          -- student / professor / lab_admin
  identity_provider TEXT        -- 'local'
  active          BOOLEAN
```

### 4.3 关键表 - 项目成员关联（多对多）

```sql
projects.project_member
  project_id      TEXT REFERENCES projects.project(id)
  user_id         TEXT
  user_name       TEXT          -- 冗余（查询性能）
  member_role     TEXT          -- leader / member / advisor / manager
  joined_at       TIMESTAMPTZ
  PRIMARY KEY (project_id, user_id)
```

## 5. API 接口

### 5.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 登录（支持账号/学号/手机号） |
| POST | `/auth/register` | 注册（管理员） |
| POST | `/auth/forgot-password` | 密码找回 |
| GET | `/auth/me` | 当前用户 |
| GET | `/auth/users` | 用户列表 |
| PATCH | `/auth/users/:id/password` | 重置密码 |
| PATCH | `/auth/users/:id/role` | 调整角色 |

### 5.2 项目管理（核心）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects` | 项目列表 |
| GET | `/projects/:id` | 项目详情 |
| POST | `/projects` | 创建项目 |
| PATCH | `/projects/:id` | 更新项目 |
| GET | `/projects/:id/members` | 项目成员 |
| GET | `/projects/:id/tasks` | 任务列表 |
| POST | `/projects/:id/tasks` | 创建任务 |
| PATCH | `/projects/:id/tasks/:taskId` | 更新任务 |
| GET | `/projects/:id/progress` | 进度报告 |
| POST | `/projects/:id/progress` | 上传进度 |
| GET | `/projects/:id/tasks/:taskId/comments` | 任务评论 |
| POST | `/projects/:id/tasks/:taskId/comments` | 添加评论 |

### 5.3 其他模块

| 模块 | 端点数量 | 前缀 |
|------|----------|------|
| 耗材管理 | 6 | `/inventory/*` |
| 文件资料 | 5 | `/files/*` |
| 会议通知 | 4 | `/meetings/*`, `/notifications/*`, `/announcements/*` |
| AI 助手 | 8 | `/ai/*` |

## 6. 角色权限速查

| 角色 | 用户数 | 核心能力 |
|------|--------|----------|
| **student** | 多 | 看库存、申请耗材、看项目、上传进度、看会议、AI问答 |
| **professor** | 多 | 审批耗材、管理项目、创建会议、创建任务、看进度 |
| **lab_admin** | 1-2 | 全权限：入库、管理用户、管理知识库、全局视图 |

详见: [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md)

## 7. 部署方式

| 方式 | 适用场景 | 命令 |
|------|----------|------|
| **Docker 开发** | 本机开发 | `docker compose up -d` |
| **VM 虚拟机** | 测试/演示 | `bash scripts/vm-setup.sh` |
| **OVA 导出** | 同学分发 | VMware → 导出 OVF |

## 8. 开发约定

| 项目 | 约定 |
|------|------|
| 语言 | TypeScript (strict: true) |
| 代码格式 | Prettier |
| 代码规范 | ESLint (max-warnings=0) |
| 测试 | Vitest |
| CI/CD | GitHub Actions (.github/workflows/ci.yml) |
| Monorepo | pnpm workspace |
| 提交规范 | 中文 commit message |
