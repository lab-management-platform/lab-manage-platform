# 开发指南

适用对象：本仓库开发者、测试与运维协作者  
更新时间：2026-07-01  
关联文档：[代码规范](./code-style.md)、[部署说明](../06-delivery/deployment-guide.md)

## 1. 环境要求

- Node.js 20.11+
- pnpm 9+
- Docker Desktop

推荐使用：

```powershell
corepack enable
corepack pnpm --version
```

## 2. 本地启动

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

常用日志：

```powershell
docker compose logs -f web
docker compose logs -f api
```

数据库迁移：

```powershell
docker compose exec api pnpm --filter @lab/api db:migrate
```

## 3. 日常开发建议

- 前端改动优先走 Vite 热更新
- 依赖、镜像层或容器配置变化时再重建镜像
- Windows 环境如文件监听不稳定，可在本机直接运行前端

## 4. 常用命令

```powershell
corepack pnpm typecheck
corepack pnpm run ci
corepack pnpm --filter @lab/web build
docker compose restart web
```

## 5. 目录职责

- `apps/api`：HTTP 宿主与装配
- `apps/web`：前端界面与交互
- `packages/core`：内核能力
- `packages/contracts`：共享契约
- `plugins/*`：业务插件

## 6. 开发原则

- 不把业务规则写进 `packages/core`
- 插件不直接导入其他插件实现源码
- 结构变更优先同步文档
- 改 `package.json` 后同步检查 `pnpm-lock.yaml`
