# 数据库设计

适用对象：后端开发、数据库设计者、跨组整合方  
更新时间：2026-07-01  
关联文档：[物理 ER 图说明](./physical-er.md)、[系统架构](../02-architecture/system-architecture.md)

## 1. 设计原则

- 按业务模块拆分 schema
- 表结构变更由仓库初始化 / 迁移逻辑驱动
- 文档以当前代码实现为准，不保留旧模型描述
- 跨模块关联优先通过明确外键或业务字段，如 `project_id`、`report_id`

## 2. Schema 划分

| Schema          | 职责                                            |
| --------------- | ----------------------------------------------- |
| `core`          | 用户、会话、审计、迁移等基础能力                |
| `projects`      | 项目、成员、任务、项目树、快照、汇报            |
| `inventory`     | 物资类别、物资目录、申请、审批、领用/借还、流水 |
| `files`         | 文件节点、文件版本、项目资料元数据              |
| `collaboration` | 会议、通知、个人已读                            |
| `ai`            | 知识文档、聊天历史、FAQ、向量表                 |

## 3. 核心数据主线

### 3.0 物资领域规则

- 物资是统一上位对象，类别通过配置扩展；首版类别包括耗材和器材。
- `return_required = false` 的耗材完成领用后结束流程，不生成归还任务。
- `return_required = true` 的器材完成借出后必须生成归还任务，支持应还日期、归还日期、逾期状态和归还验收。
- 物资主数据应保留类别、是否归还、计量方式、序列号要求和动态属性，避免将物资种类写死在表结构中。

### 3.1 账号与身份

主表：`core.app_user`

关键点：

- 身份主线为 `identity_type + identity_no`
- `student_id` 仍存在于数据库中作为兼容回填字段
- 当前注册和角色变更主流程仍主要面向 `student / professor / lab_admin`

### 3.2 项目与成员

主表：

- `projects.project`
- `projects.project_member`

关键点：

- 项目包含学生负责人 `owner_*` 与导师 `advisor_*`
- 成员角色以项目业务为准：`owner / leader / member / advisor / observer`
- 项目是其他模块的业务主轴

### 3.3 任务、项目树与汇报

主表：

- `projects.task`
- `projects.task_comment`
- `projects.project_tree_node`
- `projects.project_tree_snapshot`
- `projects.project_tree_snapshot_node`
- `projects.progress_report`
- `projects.project_report_member_work`

关键点：

- 任务可关联项目树节点
- 汇报可绑定树快照
- 快照用于保留某一时点的项目树结构

### 3.4 文件资料

主表：

- `files.lab_file`
- `files.file_version`

关键点：

- 文件既支持公共资料，也支持项目资料
- 项目资料可通过 `project_id`、`report_id`、`file_kind` 表达业务语义
- 当前更偏元数据登记与版本管理，不是正式对象存储系统

### 3.5 协作通知

主表：

- `collaboration.meeting`
- `collaboration.notification`
- `collaboration.notification_read`

关键点：

- 通知已读按用户维度记录
- 会议与公告可按项目发放

### 3.6 AI 知识库

主表：

- `ai.knowledge_document`
- `ai.chat_history`
- `ai.faq_template`
- `ai.knowledge_embedding`

关键点：

- 文本知识是当前主入口
- 文件上传后的抽取文本也进入知识库
- `knowledge_embedding` 为向量检索预留

## 4. 关键表摘要

### `core.app_user`

- 账号、角色、身份号、手机号、本地密码与认证来源

### `projects.project`

- 项目主信息、学生负责人、导师、项目文档地址、项目仓库地址、汇报周期、起止时间、状态
- 建议字段：`document_url TEXT NULL`、`repository_url TEXT NULL`
- `document_url` 保存项目文档/资料目录/NAS 文档地址，`repository_url` 保存项目代码仓库地址；两者是项目元数据，不替代 `files.lab_file` 的文件版本记录。
- 地址字段允许为空，修改项目基本信息时统一校验为合法 HTTP/HTTPS URL；平台不负责外部文档和代码仓库的访问授权。

### `projects.project_member`

- 项目成员映射、项目内角色、身份号

### `projects.project_tree_node`

- 项目树节点、层级结构、责任人、备注、交付物、状态

### `projects.progress_report`

- 结构化汇报主体，可关联树快照

### `files.lab_file`

- 文件节点、分类、项目关联、存储方式、当前版本

### `collaboration.notification_read`

- 单人已读状态，避免“一个人已读导致所有人已读”

## 5. 当前已知一致性问题

- `core.app_user` 的角色校验仍主要限制在 3 个业务主用角色
- 共享类型中的项目成员角色与 `projects` 插件业务角色尚未完全统一
- OpenAPI 对最新项目树、快照、汇报、文件上传能力的覆盖仍需继续补齐

这些问题不是数据库设计错误，而是“共享契约与运行时实现待统一”的整合议题。
