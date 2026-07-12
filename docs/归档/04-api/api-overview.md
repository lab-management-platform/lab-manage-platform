# API 总览

适用对象：前后端开发、跨组接入方、测试人员  
更新时间：2026-07-01  
关联文档：[OpenAPI 治理说明](./openapi-governance.md)、[数据库设计](../03-data/database-design.md)

## 1. 基本说明

- 开发环境基地址：`http://localhost:3000`
- 认证方式：`Authorization: Bearer <token>`
- SSE 事件流：`GET /events?token=<token>`

## 2. 认证与用户

主接口：

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/profile`
- `PATCH /auth/profile/contact`
- `PATCH /auth/profile/password`
- `GET /auth/users`
- `PATCH /auth/users/:id/password`
- `PATCH /auth/users/:id/role`
- `DELETE /auth/users/:id`

说明：

- 登录支持账号、学号/工号、手机号
- 当前注册 / 角色变更主流程主要面向 `student / professor / lab_admin`

## 3. 项目主线接口

### 项目与成员

- `GET /projects`
- `GET /projects/:id`
- `POST /projects`
- `PATCH /projects/:id`
- `GET /projects/:id/members`
- `POST /projects/:id/members`
- `PATCH /projects/:id/members/:userId`
- `DELETE /projects/:id/members/:userId`

项目对象的新增字段：

- `documentUrl?: string`：项目文档、资料目录或 NAS 文档地址。
- `repositoryUrl?: string`：项目代码仓库地址。

`POST /projects` 和 `PATCH /projects/:id` 支持写入这两个字段，`GET /projects`、`GET /projects/:id` 返回这两个字段。字段为空时返回 `null` 或不返回；接口实现需统一口径。平台只保存链接，不代理外部文档或仓库权限。

### 任务

- `GET /projects/:id/tasks`
- `POST /projects/:id/tasks`
- `PATCH /projects/:id/tasks/:taskId`
- `GET /projects/:id/tasks/:taskId/comments`
- `POST /projects/:id/tasks/:taskId/comments`

### 项目树

- `GET /projects/:id/tree`
- `PUT /projects/:id/tree`
- `POST /projects/:id/tree/snapshot`
- `GET /projects/:id/tree/history`

### 汇报与进度

- `GET /projects/:id/progress`
- `POST /projects/:id/progress`
- `GET /projects/:id/reports`
- `POST /projects/:id/reports`
- `GET /projects/:id/reports/:reportId`

## 4. 物资接口

- `GET /inventory/summary`
- `GET /inventory/materials`
- `GET /inventory/categories`
- `POST /inventory/categories`
- `GET /inventory/applications`
- `POST /inventory/applications`
- `PATCH /inventory/applications/:id/approve`
- `PATCH /inventory/applications/:id/reject`
- `PATCH /inventory/materials/:id/stock-in`
- `PATCH /inventory/materials/:id/consume`
- `PATCH /inventory/materials/:id/borrow`
- `PATCH /inventory/materials/:id/return`
- `GET /inventory/stock-movements`

物资接口统一使用 `category_id` 和 `return_required` 表达类别与归还规则。耗材申请审批完成后走 `consume` 领用流程，不生成归还任务；器材审批完成后走 `borrow` 流程，必须提供应还时间，并通过 `return` 完成归还。旧的 `materials` 路径作为兼容命名保留，业务含义升级为物资。

## 5. 文件资料接口

- `GET /files`
- `POST /files`
- `GET /files/:id/versions`
- `POST /files/:id/versions`
- `GET /projects/:id/files`
- `POST /projects/:id/files`
- `GET /projects/:id/report-files`
- `GET /projects/:id/reports/:reportId/files`

## 6. 协作接口

- `GET /meetings`
- `POST /meetings`
- `PATCH /meetings/:id/minutes`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `POST /announcements`

## 7. AI 接口

- `POST /ai/chat`
- `GET /ai/chat-history`
- `DELETE /ai/chat-history`
- `GET /ai/knowledge`
- `POST /ai/knowledge`
- `POST /ai/knowledge/upload`
- `PUT /ai/knowledge/:id`
- `DELETE /ai/knowledge/:id`
- `GET /ai/templates`

## 8. 当前文档与实现边界

当前要如实说明两点：

- OpenAPI 已覆盖核心接口框架，但尚未完全跟上所有最新业务扩展
- 运行时实现以 `apps/api` + `plugins/*` 为准，跨组整合前应优先比对本文件、OpenAPI 与实际路由
