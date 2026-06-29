# 数据库参考手册

## 1. 连接方式

```powershell
docker compose exec postgres psql -U lab -d lab_management
```

宿主机数据库工具：

- Host: `localhost`
- Port: `5432`
- User: `lab`
- Password: `lab_password`
- Database: `lab_management`

## 2. Schema 划分

系统按模块拆分 schema，避免核心与业务表混杂：

- `core`: 用户、会话、审计、迁移记录
- `inventory`: 耗材、申请、审批、库存流水
- `files`: 文件、版本
- `collaboration`: 会议、通知
- `ai`: 知识库、聊天历史、FAQ
- `projects`: 项目、成员、任务、进度、评论

## 3. 关键表

### `core.app_user`

账号主表，当前角色值为：

- `student`
- `professor`
- `lab_admin`

关键字段：

- `username`
- `student_id`
- `phone`
- `display_name`
- `role`
- `identity_provider`
- `active`
- `created_at`

### `inventory.*`

- `material`: 耗材目录与库存
- `application`: 领用申请
- `application_review`: 审批记录
- `stock_movement`: 库存流水

### `files.*`

- `lab_file`: 文件与文件夹元数据
- `file_version`: 文件版本

### `collaboration.*`

- `meeting`: 会议
- `notification`: 通知与公告

### `ai.*`

- `knowledge_document`: AI 知识文档
- `chat_history`: 对话历史
- `faq_template`: FAQ 模板

### `projects.*`

- `project`: 项目主表
- `project_member`: 项目成员关联
- `task`: 项目任务
- `task_comment`: 任务评论
- `progress_report`: 项目进度纪要

## 4. 常用查询

```sql
-- 查看所有业务 schema
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'public');

-- 查看某个 schema 的表
\dt projects.*
\dt inventory.*

-- 最近的审计记录
SELECT *
FROM core.audit_log
ORDER BY occurred_at DESC
LIMIT 20;

-- 低库存耗材
SELECT *
FROM inventory.material
WHERE stock <= warn_stock;

-- 待审批申请
SELECT *
FROM inventory.application
WHERE status = 'pending';
```

## 5. 迁移

开发环境：

```powershell
docker compose exec api pnpm --filter @lab/api db:migrate
```

生产环境：

```powershell
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
```

迁移记录保存在 `core.schema_migration`。

## 6. 维护约定

- 新业务表放进自己的 schema
- 不跨插件直接读写别人的表
- 表结构变更要同步 migration
- 对外接口变更要同步 OpenAPI
