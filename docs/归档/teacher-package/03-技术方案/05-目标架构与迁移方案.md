# 目标架构与跨组迁移方案

文档状态：v0.1，待技术评审  
整理日期：2026-07-12  
关联文档：[系统架构](./system-architecture.md) · [API 收口矩阵](../07-integration/api-consolidation-matrix.md) · [数据库设计](../03-data/database-design.md)

## 1. 目标

在允许大重构的前提下，保留主仓库已有的工程骨架和可复用能力，重新定义稳定边界：核心提供通用能力，插件承载业务，API 和数据库由主干统一治理，外部组只贡献可验证的业务能力。

## 2. 目标分层

```text
Web App
  ├─ 应用壳层：登录、导航、看板、项目上下文、错误/通知
  └─ 业务页面：由插件提供路由、页面和卡片
API Host
  ├─ 认证、权限、审计、错误、事件、配置
  └─ 插件注册、路由装配、数据库连接
Core
  ├─ PluginContract
  ├─ Auth / Permission
  ├─ EventBus
  ├─ AuditPort
  └─ Config / DynamicField / Dashboard registry
Plugins
  ├─ projects
  ├─ inventory
  ├─ files
  ├─ collaboration
  └─ ai
Infrastructure
  ├─ PostgreSQL
  ├─ NAS adapter
  ├─ AI provider adapter
  └─ Docker / deployment
```

## 3. 插件契约

每个业务插件必须能够独立说明：插件 ID、版本、依赖、权限、路由、事件、迁移、配置项、看板卡片和健康检查。建议契约形态：

```ts
type LabPlugin = {
  id: string;
  version: string;
  register(context: PluginContext): void;
  routes?: RouteDefinition[];
  permissions?: PermissionDefinition[];
  dashboardCards?: DashboardCardDefinition[];
  migrations?: MigrationDefinition[];
  healthCheck?: () => Promise<HealthStatus>;
};
```

插件之间禁止直接导入对方源码。需要联动时使用共享契约、稳定 ID 或 EventBus。例如物资申请提交发布 `inventory.application.submitted`，协作插件订阅后创建通知。

## 4. 模块边界

| 模块 | 负责 | 不负责 |
|---|---|---|
| `core` | 认证、权限、事件、审计、配置、插件契约 | 项目、物资等业务规则 |
| `projects` | 项目、成员、任务、项目树、笔记、汇报 | 库存审批、模型调用 |
| `inventory` | 物资类别、物资目录、库存、申请、审批、耗材领用、器材借用/归还、逾期 | 用户身份定义 |
| `files` | 文件元数据、版本、项目资料、存储适配 | AI 检索策略 |
| `collaboration` | 会议、请假、通知、纪要 | 项目任务本身 |
| `ai` | Provider、对话、知识库索引和问答 | 用户权限绕过、直接管理业务数据 |
| `apps/api` | 装配插件、暴露统一 HTTP API | 业务实现 |
| `apps/web` | 统一壳层、路由、展示和交互 | 绕过 API 直接访问数据库 |

## 5. 统一数据原则

- `user_id`、`project_id`、`plugin_id` 是跨模块关联的稳定标识。
- 项目主数据保留 `document_url` 和 `repository_url` 两个外部资源地址；它们只作为项目导航元数据，不把 NAS/GitLab 的内容耦合进项目插件。
- 每个插件拥有自己的表/Schema 边界，禁止跨插件直接查表。
- 跨模块读取通过 API 查询组合、领域服务或事件投影完成。
- 动态字段使用统一元数据表描述字段定义，业务表存储 JSONB 值；首版对项目和物资启用。
- 物资类别配置至少包含 `category_code`、`name`、`return_required`、`quantity_mode` 和 `active`；耗材默认不归还，器材默认需要归还。
- 物资申请状态和库存流水必须区分 `consume`（耗材领用）与 `borrow`/`return`（器材借用/归还），不能用一个“借用”状态覆盖全部物资。
- 所有状态变更记录操作者、时间、旧值/新值或动作类型。
- 删除优先使用软删除或归档状态，保证项目资料、审计和统计可追溯。

## 6. 看板扩展设计

看板不是一张写死的页面，而是查询卡片注册表：

1. 插件注册卡片元数据和查询函数。
2. API 根据用户身份和权限返回可见卡片。
3. Web 按布局配置渲染卡片。
4. 卡片提供下钻路由和筛选定义。
5. 统计与明细查询必须使用同一权限范围和过滤条件。

首版可以先用代码注册卡片，字段和布局配置后置到数据库；这样既满足模块化，又避免一开始引入过重的低代码系统。

## 7. 迁移策略

迁移按“理解—映射—重写—验证”四步执行：

1. **理解**：阅读外部组代码、数据库和运行效果，记录真实能力，不以项目名称推断功能。
2. **映射**：补充字段矩阵、接口矩阵、权限矩阵和页面映射。
3. **重写**：在主仓库插件边界内重写；外部路径、JWT、数据库连接和独立前端不直接带入。
4. **验证**：用业务场景、接口测试、数据库迁移测试和 Playwright 流程验收。

迁移优先顺序：身份/权限 → 项目主轴 → 物资类别与物资审批 → 文件/笔记/知识库 → 会议通知 → AI 增强 → NAS/本地模型适配。

## 8. 外部项目去留

| 项目/技术 | 决策 |
|---|---|
| React 19 + Vite 主前端 | 保留 |
| Fastify + TypeScript API 宿主 | 保留 |
| PostgreSQL | 保留为统一数据库 |
| Spring Boot + MySQL 独立后端 | 不作为生产依赖，仅作迁移参考 |
| 独立 Next.js 文档站 | 不作为生产入口，能力重写到 `projects/files/ai` |
| 独立物资前端 | 不作为生产入口，流程和字段吸收到 `inventory` |
| NAS | v1.0 先登记路径/外链，后续通过 adapter 正式接入 |
| 云端/本地 AI | 通过 Provider 抽象切换，首版至少完成一种可用提供方 |

## 9. API 收口规则

- 前端只调用主仓库 API。
- 所有新接口先更新 `packages/contracts` / OpenAPI，再实现运行时。
- API 统一错误格式、鉴权方式、分页、筛选、审计和项目上下文。
- 外部 API 只记录在迁移矩阵中，不继续作为生产契约。
- 兼容接口如确有需要，必须有明确的下线日期和迁移测试。

## 10. 迁移完成定义

一个外部能力只有满足以下条件，才算迁移完成：

- 有主仓库模块 Owner 和边界说明。
- 有字段、接口、权限和页面映射。
- 不依赖外部数据库或独立服务才能启动主流程。
- 有主仓库数据库迁移和回滚/修复说明。
- 有至少一个成功场景、一个无权限场景、一个异常场景的测试。
- 文档已标记“已迁移”，外部实现标记为参考或废弃。
