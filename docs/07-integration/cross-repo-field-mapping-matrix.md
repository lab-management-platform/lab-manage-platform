# 跨仓库字段映射矩阵

适用对象：数据库设计成员、后端整合成员、数据迁移脚本编写者  
更新时间：2026-07-08  
关联文档：[SmartWrite-AI 整合说明](./smartwrite-ai-real.md) · [tech-material 整合说明](./tech-material-real.md)

## 统一原则

- 主仓库字段模型为唯一事实源
- 外部仓库字段只做映射来源，不直接进入最终公共契约
- 角色、身份、项目归属、通知已读、文件存储口径都以主仓库为准

## 用户与身份

| 领域 | SmartWrite-AI | tech-material | 主仓库统一落点 | 说明 |
|---|---|---|---|---|
| 用户唯一标识 | `user.id` / 文件系统或可选 MySQL | `user.id` | `auth.user_account.id` | 外部主键只作迁移源 |
| 登录名 | `username` | `username` | `username` | 可保留为平台账号 |
| 姓名 | 取决于其用户结构 | `name` | `display_name` / `name` | 统一显示名 |
| 学号 | 无稳定主线 | `studentNo` | `identity_no` + `identity_type=student_no` | tech-material 仅学生使用 |
| 工号 | 无 | 无稳定字段 | `identity_no` + `identity_type=employee_no` | 教授/管理员需补齐 |
| 角色 | 无成熟业务角色体系 | `super_admin/admin/member` | `super_admin/admin/lab_admin/professor/member/student` | tech-material 需细化映射 |

## 项目与成员

| 领域 | SmartWrite-AI | tech-material | 主仓库统一落点 | 说明 |
|---|---|---|---|---|
| 项目主表 | 无 | `project` | `projects.project` | SmartWrite 不单独建项目 |
| 项目负责人 | 无 | `project.leaderId` | `owner_user_id` | 默认映射为学生负责人 |
| 项目状态 | 无 | `active/completed/archived` | `status` | 需映射主仓库状态集 |
| 项目成员 | 无 | `project_member` | `projects.project_member` | `leader/member` -> `owner/member` |
| 项目任务 | 无 | `task` | `projects.task` | 评论映射到 `task_comment` |

## 文档、知识与汇报

| 领域 | SmartWrite-AI | tech-material | 主仓库统一落点 | 说明 |
|---|---|---|---|---|
| 在线文档 | `documents` | 无直接等价 | `projects.note` 或笔记草稿模型 | 新增/扩展主仓库笔记能力 |
| 知识文档 | 可由文档转化 | `knowledge_doc` | `ai.knowledge_document` | 两边都并入 AI 知识库 |
| 问答记录 | 无成熟结构 | `qa_conversation` | `ai` 对话历史 | 只保留语义，不保留原表 |
| 汇报草稿 | 文档可承载 | 无专项模型 | `projects.project_report` + note/draft | 与汇报正文关联 |
| 会议纪要 | 文档可承载 | 文件/文本可承载 | `projects.note` / `meeting.minutes` | 作为项目或会议附属对象 |

## 文件资料

| 领域 | SmartWrite-AI | tech-material | 主仓库统一落点 | 说明 |
|---|---|---|---|---|
| 文件元数据 | 文件系统为主 | `file_record` | `files.lab_file` | 统一项目与资料语义 |
| 文件夹 | 无成熟目录模型 | `file_folder` | `files.lab_file(node_type=folder)` | 目录语义并入统一树 |
| 原文件名 | 文档标题/文件名 | 可映射 | `original_name` | 保留原始来源 |
| 存储位置 | `.data` 文件系统 | uploads/本地 | `storage_provider` + `nas_path` + `external_link` | 不保留外部本地盘路径 |

## 库存与审批

| 领域 | SmartWrite-AI | tech-material | 主仓库统一落点 | 说明 |
|---|---|---|---|---|
| 耗材主数据 | 无 | `material` | `inventory` 主表 | 完整迁移语义 |
| 出入库记录 | 无 | `stock_record` | `inventory` 流水模型 | 吸收更完整字段 |
| 盘点 | 无 | `inventory_check` + items | `inventory` 盘点模型 | 主仓库需补齐该子域 |
| 申请 | 无 | `application` | `inventory application` | 吸收 `approve/reject/complete` 流程 |

## 协作与通知

| 领域 | SmartWrite-AI | tech-material | 主仓库统一落点 | 说明 |
|---|---|---|---|---|
| 会议 | 无 | `meeting` / `meeting_room` | `collaboration.meeting` | 统一项目作用域 |
| 公告 | 无 | `announcement` | `collaboration` 公告能力 | 支持全部项目/单项目 |
| 通知 | 无 | `notification` | `collaboration.notification` + `notification_read` | 必须按用户已读 |

## 迁移默认值

- `tech-material.admin` 默认映射为主仓库 `admin`
- `tech-material.member` 默认先按用户资料补充映射到 `student` 或 `member`
- `project.leaderId` 默认映射到 `owner_user_id`
- 无工号的教授/管理员需要在迁移前补齐占位工号
