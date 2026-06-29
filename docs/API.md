# API 文档

完整 OpenAPI 文件在：

```text
packages/contracts/openapi/core-api.yaml
```

本文件提供开发时最常用的接口说明和调用示例。

## 1. 基础地址

开发环境：

```text
http://localhost:3000
```

生产环境经 Nginx 反代：

```text
https://你的域名/api
```

## 2. 认证方式

登录：

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123456"
}
```

返回：

```json
{
  "token": "session-token",
  "actor": {
    "id": "u-admin",
    "username": "admin",
    "displayName": "实验室管理员",
    "role": "admin",
    "permissions": []
  }
}
```

后续请求加请求头：

```http
Authorization: Bearer session-token
```

## 3. 核心接口

健康检查：

```http
GET /health
```

当前用户：

```http
GET /auth/profile
Authorization: Bearer <token>
```

修改手机号：

```http
PATCH /auth/profile/contact
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "13800000000"
}
```

修改密码：

```http
PATCH /auth/profile/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword",
  "newPassword": "NewPassword123"
}
```

## 4. 账号管理

查询账号，默认只返回启用账号：

```http
GET /auth/users?search=student
Authorization: Bearer <token>
```

显示停用账号：

```http
GET /auth/users?search=student&includeInactive=true
Authorization: Bearer <token>
```

创建账号：

```http
POST /auth/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "student002",
  "password": "Student@123456",
  "studentId": "S000002",
  "displayName": "学生二号",
  "role": "member"
}
```

重置学员密码：

```http
PATCH /auth/users/{id}/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "newPassword": "Student@123456"
}
```

调整角色：

```http
PATCH /auth/users/{id}/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin"
}
```

停用学员：

```http
DELETE /auth/users/{id}
Authorization: Bearer <token>
```

## 5. 耗材库存

库存统计：

```http
GET /inventory/summary
Authorization: Bearer <token>
```

耗材列表：

```http
GET /inventory/materials
Authorization: Bearer <token>
```

提交申请：

```http
POST /inventory/applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "materialId": "m-001",
  "quantity": 1,
  "reason": "课题实验耗材申请"
}
```

批准申请：

```http
PATCH /inventory/applications/{id}/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "remark": "库存确认无误，批准领用。"
}
```

拒绝申请：

```http
PATCH /inventory/applications/{id}/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "remark": "请补充实验说明后重新提交。"
}
```

入库：

```http
PATCH /inventory/materials/m-001/stock-in
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 5,
  "remark": "管理员入库登记"
}
```

库存流水：

```http
GET /inventory/stock-movements
Authorization: Bearer <token>
```

## 6. 文件资料

查询文件资料：

```http
GET /files?search=sop&parentId=folder-safety
Authorization: Bearer <token>
```

创建文件夹：

```http
POST /files
Authorization: Bearer <token>
Content-Type: application/json

{
  "nodeType": "folder",
  "title": "安全培训",
  "category": "sop",
  "visibility": "public",
  "tags": ["安全", "培训"],
  "description": "实验室安全培训资料"
}
```

登记文件资料。小文件可以用 `contentBase64` 直传，较大文件建议先放 NAS，再登记 `driveUrl`：

```http
POST /files
Authorization: Bearer <token>
Content-Type: application/json

{
  "nodeType": "file",
  "title": "实验记录模板",
  "category": "template",
  "parentId": "folder-id",
  "visibility": "group",
  "tags": ["模板", "实验记录"],
  "driveUrl": "https://drive.example.local/shared/template",
  "description": "Synology Drive 共享链接",
  "originalName": "template.docx",
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "sizeBytes": 1024
}
```

查询文件版本：

```http
GET /files/{id}/versions
Authorization: Bearer <token>
```

新增文件版本：

```http
POST /files/{id}/versions
Authorization: Bearer <token>
Content-Type: application/json

{
  "originalName": "template-v2.docx",
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "sizeBytes": 2048,
  "driveUrl": "https://drive.example.local/shared/template-v2",
  "changeNote": "更新实验记录字段"
}
```

下载或打开版本：

```http
GET /files/{id}/versions/{versionId}/download
Authorization: Bearer <token>
```

## 7. 会议与通知

查询会议：

```http
GET /meetings
Authorization: Bearer <token>
```

创建会议：

```http
POST /meetings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "课题组周会",
  "startsAt": "2026-05-08T10:00:00.000Z",
  "endsAt": "2026-05-08T11:00:00.000Z",
  "location": "实验室会议室",
  "onlineUrl": "https://meeting.tencent.com/example",
  "participantIds": ["u-student001"],
  "summary": "同步本周实验进展"
}
```

上传/更新会议纪要引用：

```http
PATCH /meetings/{id}/minutes
Authorization: Bearer <token>
Content-Type: application/json

{
  "minutesFileId": "file-id",
  "summary": "会议纪要摘要",
  "status": "completed"
}
```

查询站内通知：

```http
GET /notifications
Authorization: Bearer <token>
```

标记通知已读：

```http
PATCH /notifications/{id}/read
Authorization: Bearer <token>
```

发布全局公告：

```http
POST /announcements
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "实验室通知",
  "content": "请及时查看本周会议安排。"
}
```

## 7. 实时事件

前端通过 SSE 订阅：

```text
GET /events?token=<token>
```

当前用于申请提交、审批变化后的页面自动刷新。

## 8. AI 智能问答

与 AI 对话：

```http
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "如何申请实验耗材？"
}
```

返回：

```json
{
  "reply": "申请实验耗材的流程如下...",
  "sources": [{ "id": "k-001", "title": "耗材申请流程", "snippet": "..." }]
}
```

获取对话历史：

```http
GET /ai/chat-history
Authorization: Bearer <token>
```

清除对话历史：

```http
DELETE /ai/chat-history
Authorization: Bearer <token>
```

知识库管理：

```http
GET /ai/knowledge                          # 查询知识库
POST /ai/knowledge                         # 添加知识文档
PUT /ai/knowledge/:id                      # 更新知识文档
DELETE /ai/knowledge/:id                   # 删除知识文档
```

添加知识文档示例：

```http
POST /ai/knowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "耗材申请流程",
  "content": "1. 登录平台 2. 进入耗材设备页面 3. 选择耗材...",
  "category": "sop",
  "tags": ["耗材", "流程"]
}
```

FAQ 模板：

```http
GET /ai/templates
Authorization: Bearer <token>
```

AI 接入配置详见 [docs/AI_MODULE.md](./AI_MODULE.md)。
