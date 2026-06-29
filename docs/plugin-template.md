# 插件开发模板

插件是本平台扩展业务能力的基本单元。核心平台负责认证、权限、审计、事件和插件生命周期；业务规则必须放在插件里。

## 1. 插件目录结构

推荐结构：

```text
plugins/example/
  package.json
  tsconfig.json
  src/
    index.ts
```

已存在示例：

- `plugins/hello-world`：最小示例插件
- `plugins/inventory`：耗材库存业务插件
- `plugins/files`：文件资料插件

## 2. package.json 模板

```json
{
  "name": "@lab/plugin-example",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@lab/core": "workspace:*"
  }
}
```

如果插件需要访问 PostgreSQL，增加：

```json
{
  "dependencies": {
    "pg": "^8.20.0"
  },
  "devDependencies": {
    "@types/pg": "^8.20.0"
  }
}
```

## 3. tsconfig.json 模板

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "references": [{ "path": "../../packages/core" }]
}
```

## 4. src/index.ts 模板

```ts
import type { PluginManifest } from "@lab/core";

export const examplePlugin: PluginManifest = {
  name: "example",
  version: "0.1.0",
  description: "示例业务插件",
  capabilities: ["example:list"],
  routes: [
    {
      method: "GET",
      path: "/examples",
      permission: "project:read",
      summary: "查询示例数据"
    }
  ],
  eventsPublished: [],
  eventsSubscribed: [],
  async activate(context) {
    context.logger.info("example.plugin.ready");

    return {
      name: "example",
      routes: [
        {
          method: "GET",
          path: "/examples",
          permission: "project:read",
          summary: "查询示例数据",
          handler: async () => ({
            body: [{ id: "example-001", name: "示例数据" }]
          })
        }
      ]
    };
  }
};
```

## 5. 接入 API 宿主

在 `apps/api/package.json` 添加依赖：

```json
{
  "dependencies": {
    "@lab/plugin-example": "workspace:*"
  }
}
```

在 `apps/api/src/kernel.ts` 注册：

```ts
import { examplePlugin } from "@lab/plugin-example";

await kernel.register(examplePlugin);
```

在 `apps/api/tsconfig.json` 增加引用：

```json
{ "path": "../../plugins/example" }
```

在根 `tsconfig.json` 增加引用：

```json
{ "path": "plugins/example" }
```

更新锁文件：

```powershell
corepack pnpm install --frozen-lockfile=false
```

如果使用 Docker 开发环境，新增插件后刷新匿名依赖卷：

```powershell
docker compose up --build -d -V api web
```

## 6. API 契约

新增插件路由后，必须更新：

```text
packages/contracts/openapi/core-api.yaml
```

至少写清楚：

- 路径
- 方法
- 权限
- request body
- response schema
- 错误状态

## 7. 数据库规范

插件需要数据库时必须使用自己的 schema。例如：

```sql
CREATE SCHEMA IF NOT EXISTS example;

CREATE TABLE IF NOT EXISTS example.item (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

开发初始化脚本：

```text
infra/postgres/init/001_core.sql
```

生产迁移脚本：

```text
infra/postgres/migrations/
```

禁止插件直接读写其他插件的数据表。

## 8. 审计与事件

重要写操作应记录审计：

```ts
await context.audit.record({
  actorId: actor.id,
  action: "example.item.created",
  targetType: "example_item",
  targetId: item.id,
  occurredAt: new Date().toISOString(),
  metadata: {
    name: item.name
  }
});
```

跨模块通信优先使用事件或 HTTP 契约，不直接 import 其他插件。

## 9. 禁止事项

- 禁止直接导入其他插件源码。
- 禁止跨模块数据库 Join。
- 禁止把业务规则写进 `packages/core`。
- 禁止把密码、token、NAS 凭据写进代码或提交到 Git。
- 禁止新增接口但不更新 OpenAPI。

## 10. 完成检查

插件开发完成后运行：

```powershell
corepack pnpm run ci
```

CI 通过后，再进行页面或接口手动验证。
