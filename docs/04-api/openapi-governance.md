# OpenAPI 与接口治理说明

适用对象：后端开发、前端开发、测试、跨组接入方  
更新时间：2026-07-01  
关联文档：[API 总览](./api-overview.md)、[代码规范](../05-engineering/code-style.md)

## 1. 契约位置

OpenAPI 源文件：

```text
packages/contracts/openapi/core-api.yaml
```

## 2. 当前事实

当前仓库存在三个层级的“接口事实源”：

1. 运行时路由：`apps/api` + `plugins/*`
2. OpenAPI 契约：`packages/contracts/openapi/core-api.yaml`
3. 前端实际调用：`apps/web/src/hooks/useLabData.ts`

理想状态是三者一致，但当前仍有局部差异。

## 3. 当前主要差异

截至 2026-07-01，文档识别到的典型差异包括：

- OpenAPI 中部分角色枚举仍偏向旧业务主用角色
- 项目树、快照、结构化汇报、项目资料等扩展接口尚未完全覆盖
- 某些接口的字段说明仍滞后于最新实现

## 4. 治理约定

- 新增或重构公开接口时，同时更新：
  - 运行时代码
  - OpenAPI
  - 文档中的接口分组说明
- 如果本次改动来不及同步 OpenAPI，必须在 PR 和文档中明确写出“契约待补齐”
- 前端新增接口调用前，优先确认接口是否已进入 OpenAPI 或文档例外说明

## 5. 跨组整合建议

外部组不要直接以某个实现文件为唯一接口来源，应按以下顺序确认：

1. 本文档中心中的 API 总览
2. OpenAPI 源文件
3. 运行时路由实现

若三者不一致，以“运行时实现 + 文档中显式说明”作为短期事实，以 OpenAPI 补齐作为后续治理任务。
