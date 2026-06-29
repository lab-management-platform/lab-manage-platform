# API 文档

OpenAPI 源文件：

```text
packages/contracts/openapi/core-api.yaml
```

本文件只保留最常用接口和调用入口，避免与 OpenAPI 重复维护过多细节。

## 1. 基础地址

- 开发环境：`http://localhost:3000`
- 生产环境：`https://你的域名/api`

## 2. 认证

登录：

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123456"
}
```

后续请求：

```http
Authorization: Bearer <token>
```

常用认证接口：

- `POST /auth/login`
- `POST /auth/forgot-password`
- `GET /auth/profile`
- `PATCH /auth/profile/contact`
- `PATCH /auth/profile/password`
- `GET /auth/users`
- `POST /auth/register`
- `PATCH /auth/users/:id/password`
- `PATCH /auth/users/:id/role`
- `DELETE /auth/users/:id`

当前系统角色为：

- `student`
- `professor`
- `lab_admin`

## 3. 项目管理

项目插件当前是系统主轴，常用接口：

- `GET /projects`
- `GET /projects/:id`
- `POST /projects`
- `PATCH /projects/:id`
- `GET /projects/:id/members`
- `GET /projects/:id/tasks`
- `POST /projects/:id/tasks`
- `PATCH /projects/:id/tasks/:taskId`
- `GET /projects/:id/progress`
- `POST /projects/:id/progress`

## 4. 耗材管理

- `GET /inventory/summary`
- `GET /inventory/materials`
- `GET /inventory/applications`
- `POST /inventory/applications`
- `PATCH /inventory/applications/:id/approve`
- `PATCH /inventory/applications/:id/reject`
- `PATCH /inventory/materials/:id/stock-in`
- `GET /inventory/stock-movements`

示例：

```http
POST /inventory/applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "materialId": "m-001",
  "quantity": 1,
  "reason": "课题实验耗材申请",
  "projectId": "proj-001"
}
```

## 5. 文件资料

- `GET /files`
- `POST /files`
- `GET /files/:id/versions`
- `POST /files/:id/versions`
- `GET /files/:id/versions/:versionId/download`

## 6. 会议与通知

- `GET /meetings`
- `POST /meetings`
- `PATCH /meetings/:id/minutes`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `POST /announcements`

## 7. AI 助手

- `POST /ai/chat`
- `GET /ai/chat-history`
- `DELETE /ai/chat-history`
- `GET /ai/knowledge`
- `POST /ai/knowledge`
- `PUT /ai/knowledge/:id`
- `DELETE /ai/knowledge/:id`
- `GET /ai/templates`

AI 模块配置与提供商接入详见 [AI_MODULE.md](./AI_MODULE.md)。

## 8. 实时事件

前端通过 SSE 订阅领域事件：

```text
GET /events?token=<token>
```

当前主要用于申请、审批和其他业务变化后的页面刷新。
