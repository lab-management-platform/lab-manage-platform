# 接口收口矩阵

适用对象：后端整合成员、前端联调成员、契约维护成员  
更新时间：2026-07-08  
关联文档：[API 总览](../04-api/api-overview.md) · [跨仓库字段映射矩阵](./cross-repo-field-mapping-matrix.md)

## 统一原则

- 最终前端只调用主仓库 API
- 外部仓库接口只作为能力来源和迁移参考，不作为生产契约
- 对外展示的接口命名、鉴权、错误语义、项目上下文都以主仓库规则为准

## SmartWrite-AI -> 主仓库

| 外部能力 | 外部接口/模式               | 主仓库收口接口                                | 处理策略                |
| -------- | --------------------------- | --------------------------------------------- | ----------------------- |
| 文档列表 | `/api/documents`            | `GET /projects/:id/notes`                     | 改为项目上下文          |
| 新建文档 | `/api/documents` POST       | `POST /projects/:id/notes`                    | 文档对象变项目笔记/草稿 |
| 编辑文档 | `/api/documents/:id`        | `PATCH /projects/:id/notes/:noteId`           | 统一权限与审计          |
| 删除文档 | `/api/documents/:id` DELETE | `DELETE /projects/:id/notes/:noteId`          | 按项目权限删除          |
| 知识沉淀 | 无正式收口                  | `POST /ai/knowledge` / `/ai/knowledge/upload` | 文档可转知识文档        |

## tech-material -> 主仓库

### auth / user

| tech-material             | 主仓库收口                   | 说明                 |
| ------------------------- | ---------------------------- | -------------------- |
| `POST /api/auth/login`    | 继续使用主仓库 `/auth/login` | 不保留外部 JWT 逻辑  |
| `GET/POST/PUT /api/users` | 主仓库用户管理接口           | 吸收字段，不保留路径 |

### project / task

| tech-material                                     | 主仓库收口                     | 说明                                  |
| ------------------------------------------------- | ------------------------------ | ------------------------------------- |
| `GET/POST/PUT /api/projects`                      | 主仓库 `/projects`             | 按现有项目模型归一                    |
| `GET /api/projects/{id}/members`                  | 主仓库 `/projects/:id/members` | 保留语义，改命名规范                  |
| `POST /api/projects/{projectId}/members/{userId}` | 主仓库成员新增接口             | 迁移为 body 驱动，不依赖路径塞 userId |
| `GET/POST/PUT /api/tasks`                         | 主仓库项目任务接口             | 吸收评论与状态分支                    |
| `PUT /api/tasks/{id}/status`                      | 主仓库任务更新接口             | 保留“只改状态”的快捷语义              |
| `GET /api/tasks/kanban/{projectId}`               | 主仓库任务看板接口             | 由项目详情页统一取数                  |

### inventory

| tech-material                              | 主仓库收口            | 说明          |
| ------------------------------------------ | --------------------- | ------------- | ----------------------- | -------------------------- |
| `GET/POST/PUT /api/materials`              | 主仓库 inventory 接口 | 吸收物资字段  |
| `POST /api/materials/stock-in`             | 主仓库入库接口        | 保留动词语义  |
| `POST /api/materials/stock-out`            | 主仓库出库接口        | 保留动词语义  |
| `GET /api/materials/low-stock`             | 主仓库预警查询        | 保留预警视图  |
| `GET /api/stock-records`                   | 主仓库库存流水接口    | 统一结果结构  |
| `GET/POST /api/inventory-checks`           | 主仓库盘点子域接口    | 需要新增/补强 |
| `POST /api/inventory-checks/{id}/complete` | 主仓库盘点完成接口    | 保留状态推进  |
| `GET/POST/PUT /api/applications`           | 主仓库物资申请接口    | 吸收审批流    |
| `POST /api/applications/{id}/approve       | reject                | complete`     | 主仓库审批/完成动作接口 | 保留动作语义，不保留原路径 |

### collaboration

| tech-material                        | 主仓库收口       | 说明                      |
| ------------------------------------ | ---------------- | ------------------------- |
| `GET/POST /api/meetings`             | 主仓库会议接口   | 继续支持项目范围          |
| `GET/POST /api/meeting-rooms`        | 主仓库会议室接口 | 如主仓库缺失则新增        |
| `GET/POST/DELETE /api/announcements` | 主仓库公告接口   | 保留“全部项目/单项目”范围 |
| `GET /api/notifications`             | 主仓库通知接口   | 继续按 actor 过滤         |
| `PUT /api/notifications/{id}/read`   | 主仓库已读接口   | 保持按用户已读            |
| `PUT /api/notifications/read-all`    | 可选新增批量已读 | 若实现需按 actor 粒度     |

### files / ai

| tech-material                         | 主仓库收口                        | 说明                             |
| ------------------------------------- | --------------------------------- | -------------------------------- |
| `POST /api/files/upload`              | `/projects/:id/files` 或 `/files` | 统一资料类型与项目关联           |
| `POST /api/files/folders`             | 主仓库文件夹接口                  | 保留目录语义                     |
| `GET /api/files`                      | 主仓库文件查询                    | 统一 visibility/storage provider |
| `GET/POST/DELETE /api/knowledge/docs` | `/ai/knowledge`                   | 统一知识库接口                   |
| `POST /api/knowledge/ask`             | 主仓库 AI chat/knowledge 路线     | 统一模型与上下文                 |

## 必须保留的主仓库语义

- 项目上下文优先
- 角色与权限从 `packages/core` 下发
- 审计日志由主仓库统一记录
- SSE / 通知事件由主仓库统一发布
- 错误返回风格与 OpenAPI 由主仓库统一维护
