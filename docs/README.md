# 文档中心

适用对象：跨组接入方、项目维护者、平台开发者  
更新时间：2026-07-01  
关联文档：[仓库 README](../README.md)

本目录是实验室管理平台的公共文档中心，目标是让不了解本仓库历史的人也能快速回答这几个问题：

1. 这个项目要解决什么问题
2. 当前系统有哪些能力、边界和风险
3. 仓库结构、模块职责、数据库和接口如何组织
4. 如果要接入、重构或协作开发，应该从哪里开始

## 阅读路径

### 面向跨组整合

0. [技术栈](./02-architecture/technology-stack.md)
1. [项目总览](./00-overview/project-overview.md)
2. [项目需求文档](./01-product/product-requirements.md)
3. [功能设计](./01-product/functional-design.md)
4. [系统架构](./02-architecture/system-architecture.md)
5. [模块划分与文件映射](./02-architecture/module-map.md)
6. [数据库设计](./03-data/database-design.md)
7. [API 总览](./04-api/api-overview.md)
8. [已知风险与路线图](./06-delivery/known-risks-and-roadmap.md)

### 面向本组维护

1. [开发指南](./05-engineering/development-guide.md)
2. [代码规范](./05-engineering/code-style.md)
3. [提交规范](./05-engineering/commit-convention.md)
4. [插件扩展规范](./05-engineering/plugin-extension.md)
5. [部署说明](./06-delivery/deployment-guide.md)

## 目录结构

```text
docs/
├── 00-overview/      项目总览、导航、状态摘要
├── 01-product/       需求、功能、角色与权限
├── 02-architecture/  技术栈、架构、模块划分、仓库树
├── 03-data/          数据库设计与 ER 图
├── 04-api/           API 分组说明与契约治理
├── 05-engineering/   开发、代码、提交、扩展规范
└── 06-delivery/      进度、部署、风险、专题集成说明
```

## 文档清单

### 00-overview

- [project-overview.md](./00-overview/project-overview.md)
- [project-status.md](./00-overview/project-status.md)

### 01-product

- [product-requirements.md](./01-product/product-requirements.md)
- [functional-design.md](./01-product/functional-design.md)
- [roles-and-permissions.md](./01-product/roles-and-permissions.md)

### 02-architecture

- [technology-stack.md](./02-architecture/technology-stack.md)
- [system-architecture.md](./02-architecture/system-architecture.md)
- [module-map.md](./02-architecture/module-map.md)
- [repository-tree.md](./02-architecture/repository-tree.md)

### 03-data

- [database-design.md](./03-data/database-design.md)
- [physical-er.md](./03-data/physical-er.md)
- [physical-er.puml](./03-data/physical-er.puml)

### 04-api

- [api-overview.md](./04-api/api-overview.md)
- [openapi-governance.md](./04-api/openapi-governance.md)

### 05-engineering

- [development-guide.md](./05-engineering/development-guide.md)
- [code-style.md](./05-engineering/code-style.md)
- [commit-convention.md](./05-engineering/commit-convention.md)
- [plugin-extension.md](./05-engineering/plugin-extension.md)

### 06-delivery

- [project-progress.md](./06-delivery/project-progress.md)
- [deployment-guide.md](./06-delivery/deployment-guide.md)
- [known-risks-and-roadmap.md](./06-delivery/known-risks-and-roadmap.md)
- [ai-provider-integration.md](./06-delivery/ai-provider-integration.md)
- [synology-drive-adapter.md](./06-delivery/synology-drive-adapter.md)

## 维护约定

- 文档中的角色、权限、接口、表结构以当前仓库实现为准
- 如果“代码实现”和“OpenAPI / 共享契约”仍有差异，文档必须明确标注，不伪装成一致
- `.ai/AI_COLLAB_CONTEXT.md` 是本地 AI 协作文档，不纳入公共文档体系
