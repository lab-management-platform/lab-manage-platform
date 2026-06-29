# 数据库参考手册

## 连接方式

```bash
# 进容器直连（无需安装 psql）
docker compose exec postgres psql -U lab -d lab_management

# 宿主机 GUI 工具（DBeaver 等免费）
# Host: localhost  Port: 5432  User: lab  Password: lab_password  DB: lab_management
```

## 表总览（15 张 / 5 schema）

| Schema          | 表名                 | 说明            |
| --------------- | -------------------- | --------------- |
| `core`          | `app_user`           | 用户账号        |
| `core`          | `session`            | 登录会话        |
| `core`          | `audit_log`          | 审计日志        |
| `core`          | `schema_migration`   | 迁移记录        |
| `inventory`     | `material`           | 耗材库存        |
| `inventory`     | `application`        | 耗材申请        |
| `inventory`     | `application_review` | 审批记录        |
| `inventory`     | `stock_movement`     | 库存流水        |
| `files`         | `lab_file`           | 文件/文件夹     |
| `files`         | `file_version`       | 文件版本        |
| `collaboration` | `meeting`            | 会议            |
| `collaboration` | `notification`       | 站内通知        |
| `ai`            | `knowledge_document` | AI 知识库       |
| `ai`            | `chat_history`       | AI 对话历史     |
| `ai`            | `faq_template`       | AI 常见问题模板 |

---

## 表结构

### core.app_user — 用户

| 列                | 类型        | 说明                         |
| ----------------- | ----------- | ---------------------------- |
| id                | text PK     | UUID                         |
| username          | text        | 登录账号                     |
| password_hash     | text        | bcrypt 哈希                  |
| display_name      | text        | 显示姓名                     |
| role              | text        | super_admin / admin / member |
| active            | boolean     | 是否启用                     |
| phone             | text        | 手机号                       |
| student_id        | text        | 学号/工号                    |
| identity_provider | text        | local / cas                  |
| external_subject  | text        | CAS external ID              |
| created_at        | timestamptz | 创建时间                     |

### core.session — 会话

| 列         | 类型        | 说明      |
| ---------- | ----------- | --------- |
| token      | text PK     | JWT token |
| user_id    | text FK     | 用户 ID   |
| created_at | timestamptz | 创建时间  |
| expires_at | timestamptz | 过期时间  |

### core.audit_log — 审计日志

| 列          | 类型        | 说明     |
| ----------- | ----------- | -------- |
| id          | uuid PK     | UUID     |
| actor_id    | text        | 操作人   |
| action      | text        | 操作类型 |
| target_type | text        | 目标类型 |
| target_id   | text        | 目标 ID  |
| metadata    | jsonb       | 扩展信息 |
| occurred_at | timestamptz | 操作时间 |

---

### inventory.material — 耗材

| 列         | 类型    | 说明             |
| ---------- | ------- | ---------------- |
| id         | text PK | m-001            |
| name       | text    | 名称             |
| spec       | text    | 规格             |
| stock      | integer | 库存量           |
| warn_stock | integer | 预警阈值         |
| unit       | text    | 单位（个/瓶/盒） |
| location   | text    | 存放位置         |
| manager    | text    | 负责人           |

### inventory.application — 申请

| 列             | 类型        | 说明                      |
| -------------- | ----------- | ------------------------- |
| id             | text PK     | 申请 ID                   |
| material_id    | text FK     | 耗材 ID                   |
| material_name  | text        | 耗材名（冗余）            |
| applicant_id   | text FK     | 申请人 ID                 |
| applicant_name | text        | 申请人名（冗余）          |
| quantity       | integer     | 申请数量                  |
| reason         | text        | 用途说明                  |
| status         | text        | pending/approved/rejected |
| created_at     | timestamptz | 申请时间                  |
| reviewed_at    | timestamptz | 审批时间                  |
| review_remark  | text        | 审批备注                  |

### inventory.stock_movement — 库存流水

| 列          | 类型        | 说明                       |
| ----------- | ----------- | -------------------------- |
| id          | text PK     | 流水 ID                    |
| material_id | text FK     | 耗材 ID                    |
| operator_id | text        | 操作人                     |
| quantity    | integer     | 变动量                     |
| type        | text        | stock_in / application_out |
| remark      | text        | 备注                       |
| created_at  | timestamptz | 时间                       |

---

### files.lab_file — 文件/文件夹

| 列                | 类型        | 说明                                      |
| ----------------- | ----------- | ----------------------------------------- |
| id                | text PK     | 文件 ID                                   |
| title             | text        | 标题                                      |
| node_type         | text        | file / folder                             |
| category          | text        | sop/template/record/dataset/meeting/other |
| parent_id         | text FK     | 父文件夹 ID                               |
| tags              | text[]      | 标签数组                                  |
| visibility        | text        | public/group/private                      |
| storage_provider  | text        | database/synology/external_link           |
| drive_url         | text        | NAS/外部链接                              |
| description       | text        | 说明                                      |
| owner_id          | text        | 上传者 ID                                 |
| owner_name        | text        | 上传者名                                  |
| current_version   | integer     | 当前版本号                                |
| latest_version_id | text        | 最新版本 ID                               |
| original_name     | text        | 原始文件名                                |
| mime_type         | text        | MIME 类型                                 |
| size_bytes        | integer     | 文件大小                                  |
| created_at        | timestamptz | 创建时间                                  |
| updated_at        | timestamptz | 更新时间                                  |

### files.file_version — 文件版本

| 列             | 类型        | 说明                |
| -------------- | ----------- | ------------------- |
| id             | text PK     | 版本 ID             |
| file_id        | text FK     | 文件 ID             |
| version        | integer     | 版本号              |
| original_name  | text        | 文件名              |
| mime_type      | text        | MIME 类型           |
| size_bytes     | integer     | 大小                |
| content_base64 | text        | Base64 内容（<5MB） |
| drive_url      | text        | NAS 链接            |
| change_note    | text        | 更新说明            |
| uploader_id    | text        | 上传者 ID           |
| uploader_name  | text        | 上传者名            |
| created_at     | timestamptz | 时间                |

---

### collaboration.meeting — 会议

| 列              | 类型        | 说明                          |
| --------------- | ----------- | ----------------------------- |
| id              | text PK     | 会议 ID                       |
| title           | text        | 主题                          |
| starts_at       | timestamptz | 开始时间                      |
| ends_at         | timestamptz | 结束时间                      |
| location        | text        | 地点                          |
| online_url      | text        | 线上链接                      |
| participant_ids | text[]      | 参会人 ID 数组                |
| agenda_file_id  | text        | 议程文件 ID                   |
| minutes_file_id | text        | 纪要文件 ID                   |
| summary         | text        | 说明                          |
| status          | text        | scheduled/completed/cancelled |
| created_by      | text        | 创建人 ID                     |
| created_by_name | text        | 创建人名                      |
| created_at      | timestamptz | 创建时间                      |
| updated_at      | timestamptz | 更新时间                      |

### collaboration.notification — 通知

| 列           | 类型        | 说明                                      |
| ------------ | ----------- | ----------------------------------------- |
| id           | text PK     | 通知 ID                                   |
| recipient_id | text        | 接收人 ID（null=全员）                    |
| title        | text        | 标题                                      |
| content      | text        | 内容                                      |
| type         | text        | announcement/meeting/approval/task/system |
| related_type | text        | 关联类型                                  |
| related_id   | text        | 关联 ID                                   |
| read_at      | timestamptz | 已读时间                                  |
| created_by   | text        | 发布人                                    |
| created_at   | timestamptz | 发布时间                                  |

---

### ai.knowledge_document — AI 知识库

| 列         | 类型        | 说明                                           |
| ---------- | ----------- | ---------------------------------------------- |
| id         | text PK     | 文档 ID                                        |
| title      | text        | 标题                                           |
| content    | text        | 内容（全文）                                   |
| category   | text        | 分类（rules/sop/safety/equipment/faq/general） |
| tags       | text[]      | 标签数组                                       |
| created_by | text        | 创建人                                         |
| created_at | timestamptz | 创建时间                                       |
| updated_at | timestamptz | 更新时间                                       |

### ai.chat_history — AI 对话历史

| 列         | 类型        | 说明             |
| ---------- | ----------- | ---------------- |
| id         | text PK     | 消息 ID          |
| user_id    | text        | 用户 ID          |
| role       | text        | user / assistant |
| content    | text        | 消息内容         |
| created_at | timestamptz | 时间             |

### ai.faq_template — AI 常见问题模板

| 列         | 类型    | 说明     |
| ---------- | ------- | -------- |
| id         | text PK | 模板 ID  |
| question   | text    | 问题文本 |
| category   | text    | 分类     |
| sort_order | integer | 排序     |

---

## 常用命令

```sql
-- ===== 用户 =====
SELECT * FROM core.app_user;                              -- 所有用户
SELECT id, username, display_name, role, active FROM core.app_user;
SELECT * FROM core.app_user WHERE role = 'admin';         -- 管理员列表

-- ===== 会话 =====
SELECT * FROM core.session WHERE expires_at > now();      -- 当前有效会话

-- ===== 审计 =====
SELECT * FROM core.audit_log ORDER BY occurred_at DESC LIMIT 20;
SELECT action, count(*) FROM core.audit_log GROUP BY action; -- 操作统计

-- ===== 耗材 =====
SELECT * FROM inventory.material;                         -- 所有耗材
SELECT * FROM inventory.material WHERE stock <= warn_stock; -- 低库存预警

-- ===== 申请 =====
SELECT * FROM inventory.application;                      -- 所有申请
SELECT * FROM inventory.application WHERE status = 'pending'; -- 待审批
SELECT a.*, m.stock FROM inventory.application a
  JOIN inventory.material m ON a.material_id = m.id;     -- 申请+库存

-- ===== 流水 =====
SELECT * FROM inventory.stock_movement ORDER BY created_at DESC;
SELECT type, sum(quantity) FROM inventory.stock_movement GROUP BY type; -- 入库/出库汇总

-- ===== 文件 =====
SELECT * FROM files.lab_file WHERE node_type = 'folder';   -- 所有文件夹
SELECT * FROM files.lab_file WHERE node_type = 'file';     -- 所有文件
SELECT * FROM files.file_version ORDER BY created_at DESC;

-- ===== 会议 =====
SELECT * FROM collaboration.meeting ORDER BY starts_at DESC;
SELECT * FROM collaboration.meeting WHERE status = 'scheduled'; -- 未开会议

-- ===== 通知 =====
SELECT * FROM collaboration.notification ORDER BY created_at DESC;
SELECT * FROM collaboration.notification WHERE read_at IS NULL; -- 未读通知

-- ===== AI =====
SELECT * FROM ai.knowledge_document ORDER BY updated_at DESC;   -- 知识库
SELECT * FROM ai.chat_history WHERE user_id = '<用户ID>' ORDER BY created_at; -- 某用户对话
SELECT * FROM ai.faq_template ORDER BY sort_order;              -- FAQ 模板
SELECT count(*) FROM ai.chat_history;                           -- 总对话量

-- ===== 管理 =====
SELECT schemaname, tablename FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog','information_schema','public'); -- 所有业务表
\dt ai.*                                                        -- 查看 ai schema 表
\d ai.knowledge_document                                        -- 查看表详情
```

## 迁移

```bash
# 容器内执行迁移
docker compose exec api pnpm --filter @lab/api db:migrate

# 查看已应用的迁移
docker compose exec postgres psql -U lab -d lab_management -c "SELECT * FROM core.schema_migration;"
```
