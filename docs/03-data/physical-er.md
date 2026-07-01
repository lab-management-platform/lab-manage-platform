# 物理 ER 图说明

适用对象：数据库设计者、后端开发、整合实施方  
更新时间：2026-07-01  
关联文档：[数据库设计](./database-design.md)、[PlantUML 源文件](./physical-er.puml)

## 1. 使用方式

本目录中的 `physical-er.puml` 是当前数据库物理 ER 图的维护源文件。

推荐渲染方式：

```powershell
plantuml ./docs/03-data/physical-er.puml
```

或使用支持 PlantUML 的 IDE / 在线渲染器查看。

## 2. 图覆盖范围

图中覆盖以下 schema 的核心主表：

- `core`
- `projects`
- `inventory`
- `files`
- `collaboration`
- `ai`

## 3. 重点关系

- `core.app_user` 是用户身份中心
- `projects.project` 是业务主轴
- `projects.project_member` 连接用户和项目
- `projects.task`、`projects.project_tree_node`、`projects.progress_report` 围绕项目展开
- `files.lab_file` 通过 `project_id / report_id` 与项目和汇报关联
- `collaboration.meeting`、`collaboration.notification` 通过 `project_id` 表达协作范围
- `inventory.application` 通过 `project_id` 表达申请上下文
- `ai.knowledge_document` 与项目没有强外键，但在业务上可服务项目协作

## 4. 维护原则

- 表新增或关系变化时，优先更新 `physical-er.puml`
- Markdown 说明负责解释意图，不替代图本身
- 如果后续图规模过大，可以在保持总图的前提下拆分专题图
