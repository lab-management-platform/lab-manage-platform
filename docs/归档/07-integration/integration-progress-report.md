# 跨组整合进度记录

适用对象：老师汇报准备成员、跨组整合负责人、前后端实施成员  
更新时间：2026-07-08  
关联文档：[跨组整合专题入口](./README.md) · [跨组整合总说明](./integration-overview-real.md) · [字段映射矩阵](./cross-repo-field-mapping-matrix.md) · [接口收口矩阵](./api-consolidation-matrix.md)

## 当前结论

整合已经从“方案整理阶段”进入“主仓库落地阶段”。本轮不做三套系统并排展示，而是按“统一工作台 + 吸收优秀能力”的方式，把外部项目中真正有价值的设计接入主仓库。

当前第一段已经明确落地为：

- 以主仓库 `projects` 域新增“项目笔记 / 会议纪要 / 汇报草稿 / 知识草稿”能力
- 前端直接并入现有 `ProjectsPage`
- 后端新增 `projects.project_note` 与配套接口
- 不保留 `SmartWrite-AI` 的独立站和独立 `/api/documents` 作为最终生产主线

## 本轮实施步骤

### 步骤 1：重新判断三组里哪些值得整合

这一步不是“每个项目都塞一点进来”，而是先按能力做筛选：

- 主仓库继续保留：
  - 统一登录
  - 统一项目上下文
  - 统一角色与权限
  - 统一通知、文件、项目树、汇报
- `SmartWrite-AI` 优先吸收：
  - 项目内编辑体验
  - 草稿/纪要沉淀能力
  - 文本工作流的上下文组织方式
- `tech-material` 优先吸收：
  - 更完整的业务流程字段
  - 库存/审批/公告/知识文档的模块经验
  - 更偏管理后台的信息组织方式

明确不做的内容：

- 不保留 `SmartWrite-AI` 的独立站点
- 不保留 `tech-material` 的 Spring Boot / Vue 运行时作为生产依赖
- 不把三套前端直接拼进一个侧边栏

### 步骤 2：选择第一批最值得落地的能力

第一批没有先做视觉层拼接，而是优先做“最容易沉淀、最能体现整合价值”的能力：

- 项目笔记
- 会议纪要草稿
- 汇报草稿
- 知识草稿

选择这个切入点的原因：

- 它直接来自 `SmartWrite-AI` 的优势能力
- 它可以自然挂到现有 `projects` 主线，不会破坏现有导航结构
- 它能服务老师、导师、学生三类角色的真实协作
- 它比单纯换皮更能体现“整合后功能增强”

### 步骤 3：先补统一数据模型，再补页面

本轮已经采用统一模型，而不是在前端临时做一块本地状态：

- 新增 `projects.project_note`
- 统一字段：
  - `project_id`
  - `title`
  - `content`
  - `note_kind`
  - `author_id`
  - `author_name`
  - `author_identity_no`
- 统一接口：
  - `GET /projects/:id/notes`
  - `GET /projects/:id/notes/:noteId`
  - `POST /projects/:id/notes`
  - `PATCH /projects/:id/notes/:noteId`
  - `DELETE /projects/:id/notes/:noteId`

权限策略：

- 可读项目成员都能看到项目笔记
- 笔记作者本人可编辑自己的笔记
- 项目负责人 / 导师 / 管理员可编辑和删除项目内笔记

### 步骤 4：并入现有项目页，而不是新起一套外部工作台

前端采用“整合进项目管理页”的方式：

- 左侧保留笔记列表
- 右侧保留编辑面板
- 类型支持：
  - 项目笔记
  - 会议纪要
  - 汇报草稿
  - 知识草稿

这样处理的好处是：

- 用户不需要切换到另一套独立系统
- 项目、成员、任务、汇报、树和笔记天然共用一个上下文
- 后续可以继续把笔记与结构化汇报、知识库上传、会议纪要联动

## 选取的优秀设计

这次不是只看三组自己的代码，而是参考成熟产品的公开设计方法，再按实验室场景做落地裁剪。

### 1. 来自 Notion 的设计启发

参考：

- Notion 关于块编辑与页面组织的官方说明  
  <https://www.notion.so/help/writing-and-editing-basics>
- Notion 关于“块”组织方式的官方说明  
  <https://www.notion.so/help/guides/block-basics-build-the-foundation-for-your-teams-pages>
- Notion 数据库属性的官方说明  
  <https://www.notion.so/help/database-properties>

吸收点：

- 笔记不要只是一大段纯文本，要带类型、作者、更新时间这些上下文属性
- 项目内文档应该以“工作项上下文”组织，而不是散在独立页面里
- 后续可以继续把笔记、会议纪要、汇报草稿做成更结构化的块式编辑

### 1.1 来自 Obsidian 的设计启发

参考：

- Obsidian File explorer  
  <https://help.obsidian.md/plugins/file-explorer>
- Obsidian Workspaces  
  <https://help.obsidian.md/plugins/workspaces>
- Obsidian Backlinks  
  <https://help.obsidian.md/plugins/backlinks>

吸收点：

- 笔记编辑不适合继续塞在一级项目页里，应进入二级工作台
- 工作台应采用“左侧文件浏览器 + 中间编辑器 + 右侧关联信息”的三栏结构
- 支持 `[[笔记名]]` 内部链接和反向提及，能让项目笔记形成可追踪关系，而不是孤立文本块
- 更接近“仓库式文档管理”，而不是单纯表单录入：筛选头固定，文档列表滚动，正文以超文本语言为核心
- 项目管理页一级入口只保留概览和进入工作台按钮，减少主页面拥挤和交互冲突

### 2. 来自 Atlassian Design System 的设计启发

参考：

- Atlassian Components 总览  
  <https://atlassian.design/components>
- Atlassian Button  
  <https://atlassian.design/components/button>
- Atlassian Tag  
  <https://atlassian.design/components/tag>

吸收点：

- 管理台场景更适合清晰的动作层级，而不是所有按钮同权重
- 列表、标签、操作按钮应该明确区分主操作和次操作
- 页面内部要用稳定的组件语义组织复杂后台信息

### 3. 来自 Linear Method 的设计启发

参考：

- Linear Method 总览  
  <https://linear.app/method>
- Linear 关于项目与负责人原则  
  <https://linear.app/method/introduction>
- Linear 关于简洁 issue 写法  
  <https://linear.app/method/write-issues-not-user-stories>

吸收点：

- 每个项目和工作项要有明确负责人
- 列表应强调快速扫描和快速进入编辑，而不是堆过多说明文字
- 描述应该直接、紧凑，减少“空模板式”表单负担

## 为什么没有硬整合的内容

以下内容本轮明确没有直接整进去：

### `SmartWrite-AI` 没直接整包搬入的部分

- Next.js 页面结构
- 独立 `/api/documents`
- 文件系统直存逻辑

原因：

- 会形成第二套前端壳层
- 与主仓库的项目权限、角色模型、文件体系冲突
- 运行时和部署方式不统一

### `tech-material` 没直接整包搬入的部分

- Spring Boot API
- MySQL 直连配置
- 原始 Vue 管理台页面

原因：

- 主仓库已具备统一 API 宿主和插件化结构
- 整包并入只会形成双主线，后续维护更重
- 硬编码配置和粗粒度角色模型不适合直接进入主仓库

## 当前已完成项

- 已完成 `docs/07-integration` 的跨组整合专题文档
- 已完成字段映射矩阵与接口收口矩阵
- 已完成“项目笔记/草稿能力”作为第一批真实整合目标的决策
- 已开始把笔记能力落到主仓库后端与前端
- 已明确本轮采用“参考成熟产品方法 + 本项目落地裁剪”的路线
- 已开始把一级页里的临时笔记区升级为 Obsidian 风格二级笔记工作台
- 已把标题、类型等信息收进笔记前置元数据，编辑区不再混杂表单字段

## 下一批整合建议

在项目笔记稳定后，下一批建议按这个顺序推进：

1. 吸收 `tech-material` 的库存审批状态流和盘点字段
2. 把项目笔记与结构化汇报联动
3. 把会议纪要与通知/会议模块联动
4. 再评估是否需要更完整的富文本编辑器
5. 最后再考虑更深层的界面升级，而不是先换整体皮肤
