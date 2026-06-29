# 开发指南

## 1. 环境要求

必需：

- Node.js 20+
- pnpm 9+
- Docker Desktop
- PostgreSQL 由 Docker Compose 启动，不需要本机单独安装

检查命令：

```powershell
node -v
corepack pnpm -v
docker version
docker compose version
```

## 2. 本地启动

推荐使用 Docker：

```powershell
docker compose up --build -d
```

查看状态：

```powershell
docker compose ps
```

查看 API 日志：

```powershell
docker compose logs -f api
```

如果依赖新增后容器找不到包：

```powershell
docker compose up --build -d -V api web
```

## 3. 本地质量检查

每次提交前运行：

```powershell
corepack pnpm run ci
```

它会执行：

- Prettier 格式检查
- ESLint
- TypeScript 类型检查
- Vitest 测试
- 前后端构建

## 4. 推荐分工

| 小组   | 负责目录                    | 主要职责                             |
| ------ | --------------------------- | ------------------------------------ |
| 核心组 | `packages/core`、`apps/api` | 登录、权限、审计、插件注册、统一认证 |
| 前端组 | `apps/web`                  | 页面、交互、接口调用、状态刷新       |
| 耗材组 | `plugins/inventory`         | 耗材、申请、审批、库存流水           |
| 文件组 | `plugins/files`             | 文件资料、Synology Drive 适配        |
| 运维组 | `infra`、Docker 文件        | Nginx、HTTPS、Postgres、迁移、部署   |

## 5. 新增业务插件流程

假设新增项目管理插件 `plugins/projects`：

1. 创建目录：

```text
plugins/projects/
  package.json
  tsconfig.json
  src/index.ts
```

2. 在 `package.json` 中声明包名：

```json
{
  "name": "@lab/plugin-projects",
  "type": "module",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@lab/core": "workspace:*"
  }
}
```

3. 在 `src/index.ts` 中导出插件：

```ts
import type { PluginManifest } from "@lab/core";

export const projectsPlugin: PluginManifest = {
  name: "projects",
  version: "0.1.0",
  description: "项目管理插件",
  capabilities: ["projects:list"],
  routes: [
    {
      method: "GET",
      path: "/projects",
      permission: "project:read",
      summary: "查询项目"
    }
  ],
  eventsPublished: [],
  eventsSubscribed: [],
  async activate() {
    return {
      name: "projects",
      routes: [
        {
          method: "GET",
          path: "/projects",
          permission: "project:read",
          summary: "查询项目",
          handler: async () => ({ body: [] })
        }
      ]
    };
  }
};
```

4. 在 `apps/api/src/kernel.ts` 注册插件。
5. 在 `apps/api/package.json` 添加 workspace 依赖。
6. 在根 `tsconfig.json` 和 `apps/api/tsconfig.json` 添加工程引用。
7. 在 `packages/contracts/openapi/core-api.yaml` 补 API 契约。
8. 在 `apps/web/src/main.tsx` 增加页面入口。
9. 跑 `corepack pnpm install --frozen-lockfile=false` 更新锁文件。
10. 跑 `corepack pnpm run ci`。

## 6. 开发规则

- 插件不能直接导入另一个插件。
- 插件不能直接读写另一个 schema 的表。
- 新增 API 必须更新 OpenAPI。
- 重要动作必须写审计日志。
- 业务数据表放在自己的 schema，例如 `projects.*`。
- UI 列表不能无限增长，使用搜索、筛选、分页、页内滚动或“展示更多”。
- 不要把密码、NAS token、证书私钥提交到 Git。

## 7. 常见问题

`docker` 命令找不到：

先确认 Docker Desktop 已启动，并重启当前终端。如果仍然找不到 `docker`，在 Docker Desktop 安装目录中找到 `resources\bin`，把它加入 Windows 系统环境变量 `Path`。

不要把个人电脑上的绝对安装路径写进项目文档或配置。这些路径只在本机有效，上传 GitHub 后会误导其他成员。

容器里找不到新增依赖：

```powershell
docker compose up --build -d -V api web
```

测试出现 `spawn EPERM`：

通常是 Windows 权限或安全软件拦截子进程。用管理员 PowerShell 重新执行：

```powershell
corepack pnpm run ci
```
