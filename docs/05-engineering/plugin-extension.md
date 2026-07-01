# 插件扩展规范

适用对象：后端开发者、跨组新增模块实现者  
更新时间：2026-07-01  
关联文档：[系统架构](../02-architecture/system-architecture.md)、[代码规范](./code-style.md)

## 1. 插件扩展目标

插件是本仓库承接新业务模块和跨组整合的主要扩展点。新增模块优先以插件方式接入，而不是继续把逻辑堆到 API 宿主或核心包中。

## 2. 新增插件最小结构

```text
plugins/<name>/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

## 3. 接入步骤

1. 创建插件目录与基础文件
2. 在 `src/index.ts` 暴露 `PluginManifest`
3. 在 `apps/api/src/kernel.ts` 注册插件
4. 若有表结构，补充初始化 / 迁移逻辑
5. 同步更新 OpenAPI 和文档

## 4. 插件职责边界

- 可以依赖 `@lab/core` 与 `@lab/contracts`
- 不应直接依赖其他插件源码
- 不应跨 schema 直接写别人的表
- 若必须引用其他模块能力，优先通过共享契约或公开接口设计解决

## 5. 何时不应新增插件

以下情况更适合在现有模块内扩展：

- 明显属于现有 `projects`、`files`、`inventory` 等模块的子能力
- 只是页面层展示变化，没有新增独立业务边界
