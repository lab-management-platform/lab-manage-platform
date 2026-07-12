# 跨组整合展示方案

> 适用对象：向指导老师展示整合思路与进展  
> 更新时间：2026-07-09  
> 关联文档：[整合总说明](./integration-overview-real.md) · [联合汇报稿](./joint-teacher-brief.md) · [整合进度记录](./integration-progress-report.md)

---

## 一、项目背景与整合目标

### 1.1 参与整合的三个子项目

| 项目                       | 技术栈                                                        | 核心功能定位                                                     |
| -------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| **实验室管理平台**（本组） | React 19 + Fastify + PostgreSQL 16 + pnpm workspace           | 统一工作台：项目管理、物资审批、文件资料、会议通知、AI 知识库    |
| **SmartWrite-AI**          | Next.js 15 + React 18 + Tailwind + TipTap                     | 在线写作/笔记平台：富文本编辑、自动保存、文档管理                |
| **tech-material**          | Spring Boot 2.7 + MyBatis-Plus + MySQL + Vue 3 + Element Plus | 全栈管理平台：项目、任务、物资、审批、会议、公告、文件、知识问答 |

### 1.2 整合核心目标

**不是三个独立系统的简单拼接，而是以实验室管理平台为统一主干，吸收其他两组优秀能力，形成一套完整的实验室协作平台。**

最终形态：

- **唯一入口**：实验室管理平台 `apps/web` 统一工作台
- **唯一后端**：Fastify + 插件化架构，统一 API 网关
- **统一数据**：PostgreSQL 16，按 schema 分域治理
- **统一权限**：六级角色体系 + 项目级成员角色

---

## 二、整合策略总览

### 2.1 核心原则：四条不可动摇的整合铁律

```
┌─────────────────────────────────────────────────────────────┐
│  原则 1：前端壳层统一                                        │
│  → 所有功能最终落入 apps/web，不保留 Next.js / Vue 独立前端   │
│                                                             │
│  原则 2：后端主干统一                                        │
│  → 所有接口由 Fastify 插件承载，不暴露外部 Spring Boot API    │
│                                                             │
│  原则 3：数据归一                                            │
│  → identityType + identityNo 为唯一身份口径                  │
│  → project 为核心业务对象，所有模块挂载其上                   │
│                                                             │
│  原则 4：权限归一                                            │
│  → 六级角色：super_admin / admin / lab_admin / professor /   │
│              member / student                               │
│  → 项目角色：owner / leader / member / advisor / observer    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 整合路线图（四阶段推进）

```
第一阶段：架构对齐（已完成 ████████████ 100%）
├── 梳理三组功能边界与技术栈差异
├── 制定统一身份/权限/数据/接口四大归一策略
├── 产出字段映射矩阵 & 接口收口矩阵
└── 建立 docs/07-integration 文档体系

第二阶段：主线能力迁移（进行中 ██████░░░░░░ 50%）
├── ✅ 项目笔记/草稿能力（吸收 SmartWrite-AI 编辑器优势）
├── ✅ Obsidian 风格笔记工作台（参考成熟产品设计）
├── 🔲 库存审批状态流（吸收 tech-material 完整审批链）
├── 🔲 盘点与库存检查工作台
└── 🔲 公告/会议/通知增强

第三阶段：深度整合（计划中 ░░░░░░░░░░ 0%）
├── 项目笔记 ↔ 结构化汇报联动
├── 会议纪要 ↔ 通知/会议模块联动
├── 知识文档多来源标记（smartwrite_import / tech_material_import / native）
└── 完整富文本编辑器评估与升级

第四阶段：优化与收尾（计划中 ░░░░░░░░░░ 0%）
├── 界面体验统一升级
├── 性能优化与 E2E 测试
├── 旧配置清理与安全检查
└── 文档更新为"已整合现状"
```

### 2.3 各组能力归宿

```
                    ┌──────────────────────────┐
                    │   实验室管理平台（主干）    │
                    │   apps/web + apps/api     │
                    │   PostgreSQL 16           │
                    └──────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ SmartWrite-AI │    │ tech-material │    │  本组（主干）   │
│  能力来源      │    │  迁移参考      │    │  统一治理       │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ → 项目笔记     │    │ → 库存审批流   │    │ → 身份/权限     │
│ → 会议纪要     │    │ → 盘点能力     │    │ → 项目主线     │
│ → 汇报草稿     │    │ → 公告/通知    │    │ → 文件/版本     │
│ → 知识文档编辑  │    │ → 文件/知识库  │    │ → 会议/通知     │
│ → TipTap 编辑器│    │ → 任务/成员    │    │ → AI/知识库     │
│ → 自动保存     │    │ → 项目/任务    │    │ → 统一 API      │
└───────────────┘    └───────────────┘    └───────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    不做的事（明确边界）
                    ├── 不保留 SmartWrite-AI 独立站
                    ├── 不保留 tech-material Spring Boot 运行时
                    ├── 不保留外部 MySQL 直连 / JWT 实现
                    ├── 不拼接 Next.js / Vue 前端页面
                    └── 不保留文件系统存储 / 硬编码配置
```

---

## 三、架构设计

### 3.1 主干架构：微内核 + 插件化

```
┌─────────────────────────────────────────────────────────────┐
│                        apps/web                             │
│         React 19 + TypeScript + Vite 6                      │
│    ┌──────────────────────────────────────────────────┐    │
│    │  统一壳层：Sidebar + Topbar（项目上下文）          │    │
│    │  ┌────────┬────────┬────────┬────────┬────────┐  │    │
│    │  │ 项目   │ 物资   │ 文件   │ 会议   │ AI    │  │    │
│    │  │ 管理   │ 管理   │ 资料   │ 通知   │ 助手  │  │    │
│    │  └────────┴────────┴────────┴────────┴────────┘  │    │
│    └──────────────────────────────────────────────────┘    │
│    useLabData（统一数据读写 Hook）                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + SSE
┌──────────────────────────▼──────────────────────────────────┐
│                        apps/api                             │
│              Fastify + TypeScript                           │
│    ┌──────────────────────────────────────────────────┐    │
│    │  认证适配器 │ 审计适配器 │ 事件总线 │ 插件注册    │    │
│    └──────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ packages/core │  │   plugins/*   │  │   contracts   │
│  内核能力      │  │   业务插件     │  │   共享契约     │
├───────────────┤  ├───────────────┤  ├───────────────┤
│ 认证接口      │  │ projects     │  │ OpenAPI 规范  │
│ 权限定义      │  │ inventory    │  │ 共享类型定义  │
│ 审计接口      │  │ files        │  └───────────────┘
│ 事件总线      │  │ collaboration│
│ 插件契约      │  │ ai           │
└───────────────┘  └───────┬───────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     PostgreSQL 16                            │
│    Schema: core │ projects │ inventory │ files │            │
│            collaboration │ ai                                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 插件边界与职责

| 插件            | Schema          | 核心职责                                       | 整合后增强来源                                  |
| --------------- | --------------- | ---------------------------------------------- | ----------------------------------------------- |
| `core`          | `core`          | 账号、会话、审计、迁移                         | —（主干能力）                                   |
| `projects`      | `projects`      | 项目、成员、任务、项目树、快照、汇报、**笔记** | SmartWrite-AI 编辑器 + tech-material 任务模型   |
| `inventory`     | `inventory`     | 物资、申请、审批、流水、**盘点**               | tech-material 完整审批链 + 盘点                 |
| `files`         | `files`         | 文件、版本、项目资料                           | tech-material 文件目录语义                      |
| `collaboration` | `collaboration` | 会议、通知、公告                               | tech-material 项目定向 + 已读粒度               |
| `ai`            | `ai`            | 知识库、问答、FAQ                              | SmartWrite-AI 编辑体验 + tech-material 知识问答 |

---

## 四、数据整合方案

### 4.1 身份与角色统一映射

```
tech-material 角色模型（粗粒度）      主仓库角色模型（细粒度）
┌────────────────────────┐          ┌──────────────────────────┐
│ super_admin            │ ──────→  │ super_admin              │
│ admin                  │ ──────→  │ admin / lab_admin        │
│ member                 │ ──────→  │ student / member         │
│ （无 professor 概念）   │   补充→  │ professor                │
└────────────────────────┘          └──────────────────────────┘

tech-material 项目角色                主仓库项目角色
┌────────────────────────┐          ┌──────────────────────────┐
│ leader                 │ ──────→  │ owner                    │
│ member                 │ ──────→  │ member                   │
│ （无 advisor/observer） │   补充→  │ advisor / observer       │
└────────────────────────┘          └──────────────────────────┘
```

### 4.2 核心数据映射策略

```
SmartWrite-AI 数据归宿              tech-material 数据归宿
┌─────────────────────┐            ┌─────────────────────────┐
│ documents           │            │ user                    │
│  ├─ 知识型文档      │ → ai       │  → core（映射字段）      │
│  ├─ 项目笔记        │ → projects │ project / project_member│
│  ├─ 会议纪要        │ → projects │  → projects（吸收语义）  │
│  ├─ 汇报草稿        │ → projects │ task / task_comment     │
│  └─ 附件/版本       │ → files    │  → projects（看板/评论） │
└─────────────────────┘            │ material / stock_record │
                                   │  → inventory（字段增强） │
                                   │ inventory_check         │
                                   │  → inventory（新增子域） │
                                   │ application             │
                                   │  → inventory（吸收审批流)│
                                   │ meeting / announcement  │
                                   │  → collaboration        │
                                   │ notification            │
                                   │  → collaboration        │
                                   │ file_record / folder    │
                                   │  → files                │
                                   │ knowledge_doc / qa      │
                                   │  → ai                   │
                                   └─────────────────────────┘
```

### 4.3 新增数据模型示例：project_note

此为第一批整合落地的核心模型，吸收 SmartWrite-AI 的文档编辑能力：

```sql
-- plugins/projects schema
CREATE TABLE projects.project_note (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects.project(id),
    title           TEXT NOT NULL,
    content         TEXT,                          -- 正文（支持 Markdown）
    content_json    JSONB,                         -- 结构化内容（富文本）
    note_kind       TEXT NOT NULL DEFAULT 'project_note',
        -- project_note | meeting_minutes | report_draft | knowledge_draft
    author_id       UUID NOT NULL,
    author_name     TEXT,
    author_identity_no TEXT,
    status          TEXT DEFAULT 'draft',           -- draft | published | archived
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 五、API 整合方案

### 5.1 统一接口策略

```
最终前端 ──HTTP──→ 主仓库 Fastify API ──→ PostgreSQL
                                    └──→ 事件总线（SSE）

✗ 不再调用：SmartWrite-AI /api/documents
✗ 不再调用：tech-material Spring Boot API（任何路径）
```

### 5.2 已落地的首批统一接口（项目笔记）

| 方法     | 路径                          | 说明                                    |
| -------- | ----------------------------- | --------------------------------------- |
| `GET`    | `/projects/:id/notes`         | 获取项目下全部笔记列表                  |
| `POST`   | `/projects/:id/notes`         | 新建项目笔记（支持 frontmatter 元数据） |
| `GET`    | `/projects/:id/notes/:noteId` | 获取单篇笔记详情                        |
| `PATCH`  | `/projects/:id/notes/:noteId` | 更新笔记内容与元数据                    |
| `DELETE` | `/projects/:id/notes/:noteId` | 删除笔记（按项目权限）                  |

### 5.3 接口收口矩阵（核心部分）

```
能力域          SmartWrite-AI 原接口        tech-material 原接口        主仓库统一收口
───────         ───────────────────        ───────────────────         ────────────
文档/笔记       /api/documents             —                           /projects/:id/notes
知识库          —                          /api/knowledge/docs         /ai/knowledge
物资            —                          /api/materials              /inventory/*
出入库          —                          /api/materials/stock-*      /inventory/*/stock-*
盘点            —                          /api/inventory-checks       /inventory/checks
申请审批        —                          /api/applications           /inventory/applications
项目            —                          /api/projects               /projects
任务            —                          /api/tasks                  /projects/:id/tasks
会议            —                          /api/meetings               /collaboration/meetings
公告            —                          /api/announcements          /collaboration/announcements
通知            —                          /api/notifications          /collaboration/notifications
文件            —                          /api/files                  /files
认证            —                          /api/auth/login             /auth/login（主仓库）
```

---

## 六、前端整合方案

### 6.1 统一工作台设计

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar：项目选择器 │ 消息通知 │ 用户头像 │ 角色标识          │
├────────┬─────────────────────────────────────────────────────┤
│        │                                                     │
│ 侧边   │                  页面内容区                          │
│ 导航   │                                                     │
│        │  ┌─────────────────────────────────────────────┐   │
│ 📂项目  │  │ 项目详情 │ 任务看板 │ 项目笔记 │ 文件资料 │ … │   │
│ 📦物资  │  ├─────────────────────────────────────────────┤   │
│ 📁文件  │  │                                             │   │
│ 📅会议  │  │         模块子页面 / 工作台视图              │   │
│ 🤖AI   │  │                                             │   │
│        │  └─────────────────────────────────────────────┘   │
│        │                                                     │
└────────┴─────────────────────────────────────────────────────┘
```

### 6.2 笔记工作台（已落地，吸收 Obsidian 设计）

```
┌────────────┬────────────────────────┬───────────────────┐
│ 筛选头（固定）│     编辑区              │  关联信息面板      │
│ 🔍 搜索    │                        │                   │
│ 📋 类型过滤 │  ───                    │  📎 内部链接      │
│ ───────── │  title: 周报           │   [[培养记录]]    │
│ 笔记列表   │  type: report_draft    │   [[实验数据]]    │
│ （可滚动）  │  tags: [周报, HeLa]    │                   │
│           │  ───                    │  🔗 反向提及      │
│ 📄 周报1   │                        │   - 被 2 篇引用   │
│ 📄 纪要3   │  # 本周工作摘要         │                   │
│ 📄 草稿5   │                        │  📊 最近修改      │
│           │  正文内容支持           │   3小时前         │
│ ───────── │  [[内部链接]] 点击跳转   │                   │
│ ＋新建笔记 │                        │                   │
└────────────┴────────────────────────┴───────────────────┘
```

设计要点（参考 Obsidian 官方设计）：

- **三栏布局**：文件浏览器 + 编辑器 + 关联信息
- **筛选固定**：搜索和类型过滤不跟随列表滚动
- **前置元数据**：title/type/tags 以 YAML frontmatter 形式存在于编辑区
- **内部链接**：`[[笔记名]]` 在预览区直接可点击跳转
- **卡片高度统一**：新建笔记不会压缩已有卡片高度
- **二级工作台**：一级页面仅保留概览入口，编辑在独立工作台进行

---

## 七、参考的成熟设计

我们不是闭门造车，每一块设计都有据可查：

### 7.1 文档编辑 → Notion

| 参考来源                                                                                 | 吸收点                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Notion Writing & Editing Basics](https://www.notion.so/help/writing-and-editing-basics) | 文档带类型/作者/时间属性；以工作上下文组织而非散页 |
| [Notion Database Properties](https://www.notion.so/help/database-properties)             | 笔记元数据结构化（title/type/tags/status）         |

### 7.2 笔记工作台 → Obsidian

| 参考来源                                                                 | 吸收点                                         |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| [Obsidian File Explorer](https://help.obsidian.md/plugins/file-explorer) | 左侧文件浏览器 + 固定筛选头 + 可滚动列表       |
| [Obsidian Workspaces](https://help.obsidian.md/plugins/workspaces)       | 三栏工作台布局；二级页面编辑器                 |
| [Obsidian Backlinks](https://help.obsidian.md/plugins/backlinks)         | `[[内部链接]]` + 反向提及面板 + 文章内直接跳转 |

### 7.3 交互规范 → Atlassian Design System

| 参考来源                                                    | 吸收点                                      |
| ----------------------------------------------------------- | ------------------------------------------- |
| [Atlassian Components](https://atlassian.design/components) | 管理台动作层级；主/次操作区分；稳定组件语义 |

### 7.4 项目管理 → Linear Method

| 参考来源                                   | 吸收点                                       |
| ------------------------------------------ | -------------------------------------------- |
| [Linear Method](https://linear.app/method) | 项目明确负责人；列表快速扫描；减少空模板负担 |

---

## 八、当前整合进展

### 已完成的里程碑

```
✅ 2026-07-08  完成跨组整合专题文档体系
               ├── integration-overview-real.md    整合总说明
               ├── smartwrite-ai-real.md           SmartWrite-AI 技术文档
               ├── tech-material-real.md            tech-material 技术文档
               ├── cross-repo-field-mapping-matrix.md  字段映射矩阵
               ├── api-consolidation-matrix.md         接口收口矩阵

✅ 2026-07-08  完成第一批真实功能整合：项目笔记/草稿能力
               ├── 后端：projects.project_note 表 + 5 个 REST 接口
               ├── 前端：ProjectNotesWorkspace（Obsidian 风格三栏工作台）
               ├── 权限：项目成员可见 / 作者可编辑 / 负责人可管理
               └── 验证：TypeScript 类型检查 + Prettier 格式检查 通过

✅ 2026-07-09  笔记工作台二次优化
               ├── 标题和类型并入 frontmatter 元数据，编辑区干净
               ├── [[内部链接]] 在预览区直接可点击跳转
               ├── 筛选头固定 + 列表独立滚动
               ├── 卡片高度统一，新建不压缩布局
               └── 一级页仅保留概览入口
```

### 进行中的工作

```
🔲 库存审批状态流（吸收 tech-material approve/reject/complete 链）
🔲 盘点与库存检查子域（吸收 tech-material inventory_check 模型）
🔲 公告/通知/会议的项目定向能力增强
```

---

## 九、安全与风险管控

### 9.1 已识别的关键风险

| 风险             | 来源                          | 应对策略                                     |
| ---------------- | ----------------------------- | -------------------------------------------- |
| 硬编码数据库密码 | tech-material                 | 整合前标记废弃，不进入主仓库公共配置         |
| 明文 JWT secret  | tech-material                 | 迁移后使用主仓库统一密钥管理                 |
| 过粗角色模型     | tech-material (3 级)          | 映射到主仓库 6 级角色体系                    |
| 文件系统存储     | SmartWrite-AI (.data/\*.json) | 全部迁移至 PostgreSQL + NAS/storage provider |
| 双平台长期并存   | 不整合直接接入                | 明确"迁移后废弃原运行时"原则                 |

### 9.2 整合前置安全检查清单

- [x] tech-material 硬编码配置已识别
- [x] SmartWrite-AI 文件系统存储路径已识别
- [x] 外部仓库 JWT 实现不进入主仓库
- [ ] 数据迁移脚本编撰（待第二阶段）
- [ ] 旧环境安全配置清理验证（待最终阶段）

---

## 十一、后续计划与时间线

### 近期（本周～下周）

```
Week 1 (本周)
├── 周五：向老师汇报整合思路，确认功能边界 ← 当前
├── 完成笔记工作台体验优化
├── 库存审批状态流：吸收 approve → reject → complete 完整链
├── 盘点子域：新增 inventory_check 模型与接口
├── 公告/通知/会议的项目定向能力
└── 更新整合进度文档
```

### 中期（2-4 周）

```
├── 项目笔记 ↔ 结构化汇报联动
├── 会议纪要 ↔ 通知/会议模块联动
├── 知识文档多来源标记体系
├── 跨仓库数据迁移脚本
└── 可演示的整合版本（v1.0）
```

### 长期（1-2 月）

```
├── 完整富文本编辑器升级
├── 界面统一体验优化
├── E2E 自动化测试覆盖
└── 部署与运维文档
```
