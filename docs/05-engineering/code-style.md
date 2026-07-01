# 代码规范

适用对象：前后端开发者、代码评审者  
更新时间：2026-07-01  
关联文档：[提交规范](./commit-convention.md)、[模块划分与文件映射](../02-architecture/module-map.md)

## 1. 总体原则

- 业务规则尽量留在插件层
- 公共能力留在 `packages/core`
- 共享契约集中在 `packages/contracts`
- 文档、代码、接口描述尽量同步演进

## 2. Monorepo 规则

- `apps/*` 负责运行入口
- `packages/*` 负责共享基础能力
- `plugins/*` 负责领域业务
- 不跨边界偷用实现细节

## 3. 后端规范

- 路由定义集中在插件入口
- 数据表按 schema 隔离
- 写操作优先记录审计
- 对外接口变更同步 OpenAPI 与文档

## 4. 前端规范

- 页面放在 `components/pages`
- 壳层放在 `components/layout`
- 业务强组件单独拆到对应目录，如 `components/projects`
- 共享 UI 放在 `components/shared`
- 数据拉取与写操作集中到 `hooks/useLabData.ts`

## 5. 类型与契约

- 前后端共享字段语义尽量统一
- 当前若存在“共享类型落后于业务实现”，必须在文档中说明
- 不把临时兼容字段误写成长期主模型

## 6. 格式与质量

- 格式化：Prettier
- 规范检查：ESLint
- 类型检查：TypeScript
- 提交前最小验证：`corepack pnpm run ci`
