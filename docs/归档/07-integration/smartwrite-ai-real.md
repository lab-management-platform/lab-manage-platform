# SmartWrite-AI 整合说明（真实落地版）

适用对象：负责接入 SmartWrite-AI 的开发成员、后端/前端架构负责人  
更新时间：2026-07-08  
关联文档：[跨组整合总说明](./integration-overview-real.md) · [AI 助手专题](../06-delivery/ai-provider-integration.md)

## 现状判断

`SmartWrite-AI` 当前是一个独立的在线写作平台，特征如下：

- 技术栈：`Next.js 15 + React 18 + Tailwind + TipTap`
- 认证方式：自带登录/注册，会话侧重前端本地管理
- 数据存储：默认文件系统 `.data/*.json`，可选 MySQL
- 核心能力：文档创建、富文本编辑、自动保存、文档列表

它适合提供“文档编辑体验”和“轻量笔记管理能力”，但不适合原样并入本平台，原因是：

1. 身份体系与本平台不一致
2. 默认存储是文件系统，不适合统一生产架构
3. 文档实体没有项目主线和实验室权限语义
4. 路由、页面壳层和导航体系与本平台重复

## 推荐整合定位

不保留 `SmartWrite-AI` 为独立产品，而是把其中有价值的部分拆为以下能力：

- 项目笔记编辑器
- 知识库文档编辑器
- 阶段汇报草稿编辑器
- 会议纪要编辑器
- AI 助手的上下文素材编辑入口

## 建议接入方式

### 前端

- 不把 `SmartWrite-AI` 的整套 Next.js 前端嵌入
- 只评估复用：
  - TipTap 编辑器配置
  - 文档列表交互思路
  - 自动保存策略
- 最终界面仍在本仓库 `apps/web` 中落地

### 后端

- 不复用其 `/api/documents` 为最终接口
- 在本仓库 API 中新增或扩展：
  - 项目笔记接口
  - 知识库文档接口
  - 汇报文本草稿接口

## 数据库映射建议

### 不建议保留的原模型

- 文件系统 `.data/users.json`
- 文件系统 `.data/documents.json`
- 独立于项目与统一账号之外的文档表

### 建议映射到本仓库的数据域

#### 方案 A：知识沉淀主线

- 知识型文档归入 `ai` 相关表
- 适用于：
  - SOP
  - 常见问题
  - 课题背景资料
  - AI 问答知识源

#### 方案 B：项目资料主线

- 正式文稿、阶段草稿、纪要稿关联到 `projects` 与 `files`
- 适用于：
  - 项目周报草稿
  - 汇报初稿
  - 项目笔记
  - 会议纪要

### 推荐新增表

如需保留“可编辑文本草稿”这一类对象，建议新增：

```text
projects.project_note
- id
- project_id
- title
- content_json
- content_text
- note_kind
- author_user_id
- author_identity_no
- status
- created_at
- updated_at
```

`note_kind` 可包含：

- `project_note`
- `meeting_minutes`
- `report_draft`
- `knowledge_draft`

## API 对接建议

### 推荐新增接口

```text
GET    /projects/:id/notes
POST   /projects/:id/notes
GET    /projects/:id/notes/:noteId
PATCH  /projects/:id/notes/:noteId
DELETE /projects/:id/notes/:noteId
```

知识库文档可扩展为：

```text
GET    /ai/knowledge-documents
POST   /ai/knowledge-documents
PATCH  /ai/knowledge-documents/:docId
```

### 不建议直接保留的旧接口模式

- `/api/documents` 直接面向浏览器存取
- 依赖本地 JSON 文件的文档保存逻辑

## 权限映射

### 项目笔记

- 学生成员：可新建、编辑自己笔记
- 项目负责人：可查看全项目笔记，可标记重点
- 教授/管理员：可查看、点评、归档

### 知识库文档

- 教授/管理员：可新增与发布
- 学生：可提交草稿或补充材料
- AI 模块：可读取“已发布”内容作为知识源

## 前端落点建议

### 路径 1：接入 AI 助手

- 在 `AI 助手` 中增加“知识文档管理”
- 支持上传、富文本编辑、文档预览、加入知识库

### 路径 2：接入项目管理

- 在项目详情页增加“项目笔记 / 汇报草稿”
- 与当前项目上下文绑定

### 路径 3：接入文件资料

- 在 `文件资料` 下增加“在线文稿”分类
- 与附件上传、版本记录并列

## 改造成本评估

### 可直接复用

- 文档编辑器思路
- 自动保存交互
- 文档基础元数据结构

### 需要重做

- 认证接入
- 权限控制
- 项目绑定
- 消息通知
- 持久化结构
- 页面壳层

## 结论

`SmartWrite-AI` 最适合作为“编辑能力来源”和“文档场景参考”，而不是整包接入。整合时应把它拆解为：

- 编辑器能力
- 项目笔记能力
- 知识库文档能力
- 汇报草稿能力

这样既能保留其价值，也不会破坏当前实验室平台的统一主线。
