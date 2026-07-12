# 部署说明

适用对象：运维、实施、后端维护者  
更新时间：2026-07-01  
关联文档：[开发指南](../05-engineering/development-guide.md)

## 1. 当前部署形态

当前仓库主要通过 Docker Compose 管理：

- `web`
- `api`
- `postgres`

并提供生产配置：

- `docker-compose.prod.yml`
- `Dockerfile`
- `infra/nginx`

## 2. 开发环境启动

```powershell
docker compose up --build -d
```

## 3. 生产环境关注点

- 环境变量分离
- 数据库持久化
- Nginx 反向代理
- HTTPS
- AI 提供商网络可达性
- NAS / 外部存储凭证隔离

## 4. 迁移

```powershell
docker compose exec api pnpm --filter @lab/api db:migrate
```

## 5. 当前说明

生产部署说明以“可行骨架”存在，后续跨组整合若引入新基础设施，需要同步更新本文件和 `infra/` 目录说明。
