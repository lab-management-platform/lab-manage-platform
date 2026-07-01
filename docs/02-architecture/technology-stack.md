# 技术栈

适用对象：架构设计者、跨组接入方、开发负责人  
更新时间：2026-07-01  
关联文档：[系统架构](./system-architecture.md)、[开发指南](../05-engineering/development-guide.md)

## 1. 前端

- React 19
- TypeScript
- Vite 6
- 单仓库内集中样式与页面模块组织

选择原因：

- 适合快速迭代管理后台与模块化页面
- 类型可与后端、共享契约协同
- Vite 适合开发环境快速反馈

## 2. 后端

- Fastify
- TypeScript
- 插件化路由注册

选择原因：

- 轻量、易于按插件注册路由
- 适合把业务模块拆成独立插件
- 方便后续扩展审计、事件、认证等横切能力

## 3. 数据库

- PostgreSQL 16
- 按 schema 划分模块：`core / projects / inventory / files / collaboration / ai`

选择原因：

- 关系模型清晰，适合权限、项目、文件、审批等强关联业务
- schema 隔离适合按插件划分边界

## 4. 工程与协作

- pnpm workspace
- ESLint
- Prettier
- Commitlint
- Husky

## 5. 测试与验证

- Vitest
- Playwright smoke
- GitHub Actions CI

## 6. 部署

- Docker Compose（开发与生产）
- Nginx / PostgreSQL 配置位于 `infra/`

## 7. 整合导向

后续跨组整合不要求所有小组完全沿用这套技术栈，但至少要沿用这些边界：

- 项目主线的数据模型
- 插件/模块边界
- 公开接口契约
- 数据库 schema 职责分层
