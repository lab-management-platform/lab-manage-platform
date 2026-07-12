# tech-material 整合说明（真实落地版）

适用对象：整合开发负责人、后端/数据库/前端迁移成员  
更新时间：2026-07-08  
关联文档：[跨组整合总说明](./integration-overview-real.md) · [字段映射矩阵](./cross-repo-field-mapping-matrix.md) · [接口收口矩阵](./api-consolidation-matrix.md)

## 现状判断

`tech-material` 名义上偏物资管理，但实际已经是一个独立的全栈平台：

- 后端：`Spring Boot 2.7 + MyBatis-Plus + MySQL + JWT`
- 前端：`Vue 3 + Vite + Pinia + Element Plus`
- 业务覆盖：
  - 用户与登录
  - 项目与成员
  - 任务与评论
  - 物资、出入库、盘点、申请审批
  - 会议、公告、通知
  - 文件管理
  - 知识文档与问答

因此它不能按“单一物资模块”接入，而要按“第二套完整平台能力拆解迁移”处理。

## 整合原则

- 不保留 `tech-material` 为长期生产主栈
- 不保留其 `Spring Boot + MySQL + Vue` 作为最终对外架构
- 只迁移：
  - 流程设计
  - 缺失字段
  - 更完整的状态流转
  - 值得吸收的页面交互与统计方式

## 模块映射

| tech-material 模块 | 主仓库落点 | 处理方式 |
|---|---|---|
| `auth` / `user` | `packages/core` + `apps/api` | 迁移字段与角色映射，不复用 JWT 实现 |
| `project` / `project_member` | `plugins/projects` | 迁移数据语义，复用主仓库项目主线 |
| `task` / `task_comment` | `plugins/projects` | 吸收看板/评论/状态流转细节 |
| `material` / `stock_record` / `inventory_check` / `application` | `plugins/inventory` | 重点吸收审批与盘点流程 |
| `meeting` / `announcement` / `notification` | `plugins/collaboration` | 迁移“范围与状态规则”，不保留独立已读逻辑 |
| `file_record` / `file_folder` | `plugins/files` | 映射文件元数据与目录语义 |
| `knowledge_doc` / `qa_conversation` | `plugins/ai` | 并入知识库与 AI 对话上下文 |

## 已识别的关键差异

### 角色模型

`tech-material.user.role` 只有：

- `super_admin`
- `admin`
- `member`

这比主仓库更粗，整合时必须映射到主仓库六级角色，不可原样接入。

### 项目成员模型

`project_member.role` 只有：

- `leader`
- `member`

整合时应映射为：

- `leader` -> 默认 `owner`
- `member` -> `member`

如后续需要导师或观察者，必须使用主仓库结构扩展。

### 技术与安全问题

仓库中存在必须在整合前废弃的内容：

- 硬编码 MySQL 地址
- 明文用户名/密码
- 明文 JWT secret

这些配置不能进入主仓库公共环境。

## 可直接吸收的能力

### inventory

- 库存盘点单独建模
- 申请审批的 `approve / reject / complete` 状态链
- 更细的出入库记录与低库存提醒

### collaboration

- 公告与通知的模块拆分方式
- 会议室可用性建模思路

### ai / knowledge

- 知识文档和问答分离的对象模型

### files

- 文件夹与文件分层组织的语义

## 不建议直接保留的实现

- Spring Boot 控制器路径命名
- Vue 路由与 Element Plus 管理台页面
- MySQL 表结构原样迁入
- 当前 `notification` 的单系统思维实现

## 整合优先级

1. 先抽字段和状态机
2. 再补主仓库表与接口
3. 再写迁移脚本
4. 最后吸收交互

## 当前结论

`tech-material` 是一个“可拆解的完整参考系统”，不是一个可以直接并入主仓库的单模块子项目。整合时应把它当成：

- 库存/审批流程增强来源
- 公告/会议/通知规则参考
- 文件/知识文档辅助能力来源

而不是第二套长期并存的平台。
