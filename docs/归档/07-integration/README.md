# 跨组整合专题

适用对象：跨组整合负责人、项目维护者、答辩/汇报准备成员  
更新时间：2026-07-08  
关联文档：[文档中心](../README.md) · [项目总览](../00-overview/project-overview.md) · [系统架构](../02-architecture/system-architecture.md)

本目录用于承接“以实验室管理平台为主干，整合其他小组功能”的专题说明。当前已确认的正式整合对象为 `SmartWrite-AI` 与 `tech-material`。文档分成三类：

- `*-real.md`：面向真实落地的整合文档，重点写清数据库、接口、模块归并和改造成本
- `*-lead-brief.md`：面向各组组长汇报的高层版本，用第一人称说明本组如何并入主干
- `joint-*.md`：如需本地汇报口径，可保存在本地，不纳入公共仓库

## 当前整合对象

1. `SmartWrite-AI`
   - 原始定位：在线写作/笔记平台
   - 适合整合方向：项目笔记、知识沉淀、阶段纪要、AI 写作辅助素材管理
2. `tech-material`
   - 原始定位：独立的全栈管理平台，覆盖项目、任务、物资、审批、会议、通知、文件、知识文档
   - 适合整合方向：拆解为 `inventory / projects / collaboration / files / ai` 各域的能力增强来源

## 文档清单

### 总览

- [integration-overview-real.md](./integration-overview-real.md)
- [integration-progress-report.md](./integration-progress-report.md)
- [joint-teacher-brief.md](./joint-teacher-brief.md)
- [cross-repo-field-mapping-matrix.md](./cross-repo-field-mapping-matrix.md)
- [api-consolidation-matrix.md](./api-consolidation-matrix.md)

### SmartWrite-AI

- [smartwrite-ai-real.md](./smartwrite-ai-real.md)
- [smartwrite-ai-lead-brief.md](./smartwrite-ai-lead-brief.md)

### tech-material

- [tech-material-real.md](./tech-material-real.md)
- [tech-material-lead-brief.md](./tech-material-lead-brief.md)

## 阅读建议

- 如果是准备真正接代码、接库、接接口：先看 `integration-overview-real.md`，再看两个矩阵文档和各组 `*-real.md`
- 如果是准备向老师汇报：建议另存本地讲稿，不和公共整合文档一起提交

## 当前结论

- 前端短期不建议“三套界面硬拼”，而是沿用本仓库现有实验室管理平台作为统一壳层
- 整合工作优先级应是：
  1. 统一身份与权限
  2. 统一数据模型
  3. 收口 API
  4. 最后再做界面入口与交互整合
- `SmartWrite-AI` 更适合作为“项目笔记 / 知识沉淀能力源”，不适合整包原样嵌入
- `tech-material` 不是单一物资模块，而是一套需要拆解迁移的完整管理台
