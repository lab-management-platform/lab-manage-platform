# 生产部署指南

本项目的开发环境使用 `docker-compose.yml`，生产环境使用 `docker-compose.prod.yml`。生产配置将前端构建为静态文件，由 Nginx 对外提供服务，并把 `/api` 反向代理到 API 容器。

## 1. 准备环境变量

复制生产环境模板：

```powershell
Copy-Item .env.production.example .env.production
```

至少修改：

```text
POSTGRES_PASSWORD=强密码
DATABASE_URL=postgres://lab:强密码@postgres:5432/lab_management
JWT_SECRET=长随机字符串
HTTP_PORT=80
```

## 2. 执行数据库迁移

首次部署或升级版本后执行：

```powershell
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
```

迁移文件放在 `infra/postgres/migrations`，按文件名顺序执行，已执行记录写入 `core.schema_migration`。

## 3. 启动生产服务

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```

启动后：

- Web 入口：`http://服务器地址`
- API 入口：`http://服务器地址/api`
- 健康检查：`http://服务器地址/api/health`

## 4. HTTPS 配置

默认生产 compose 使用 `infra/nginx/default.conf`，只监听 HTTP。启用 HTTPS 时：

1. 准备证书文件，例如：
   - `infra/nginx/certs/fullchain.pem`
   - `infra/nginx/certs/privkey.pem`
2. 将 `infra/nginx/https.example.conf` 中的 `server_name` 改为真实域名。
3. 在 `docker-compose.prod.yml` 的 `web` 服务中增加证书挂载和 443 端口，并把 Nginx 配置挂载到 `/etc/nginx/conf.d/default.conf`。

示例：

```yaml
ports:
  - "80:80"
  - "443:443"
volumes:
  - ./infra/nginx/https.example.conf:/etc/nginx/conf.d/default.conf:ro
  - ./infra/nginx/certs:/etc/nginx/certs:ro
```

## 5. 常用运维命令

查看服务：

```powershell
docker compose -f docker-compose.prod.yml ps
```

查看日志：

```powershell
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
```

停止服务：

```powershell
docker compose -f docker-compose.prod.yml down
```
