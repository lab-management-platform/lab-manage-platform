# 实验室管理平台

## 1. 项目简介与状态

面向高校实验室、课题组和项目成员，以项目为主线管理项目树、进度汇报、物资、资料、会议通知和 AI 问答。当前状态为开发中、可演示。

- GitHub 交付分支：`github-handoff`，基于 `dev`。
- 克隆后执行 `git rev-parse HEAD`，可记录当前交付版本的完整 Commit ID。

## 2. 技术栈与环境

- 本地运行：Linux Docker Engine 或启用 Linux 容器的 Windows Docker Desktop，需 Docker Compose v2。
- 源码开发：Node.js 22（包声明最低 20.11）、Corepack、pnpm 9.15.4。依赖见各工作区的 `package.json` 和根目录的 `pnpm-lock.yaml`。
- 应用：React 19、TypeScript、Vite 6、Fastify 5、PostgreSQL 16。生产配置另有 Nginx、Keycloak 26.2 和 K3s 清单。
- 基本功能可在普通 CPU 上运行。无需 GPU、ROS 或专用驱动。可选的 Ollama 服务有独立的资源要求。

## 3. 项目结构

```text
├── apps/api/src/main.ts          Fastify 入口、认证与工作台 API
├── apps/api/test/                Vitest API 和内核测试
├── apps/web/src/                 React 前端、页面与数据请求
├── packages/core/                插件内核、角色及认证适配器
├── packages/contracts/           共享接口与数据契约
├── plugins/                      项目、物资、资料、会议、AI 等插件
├── infra/                        PostgreSQL 初始化与迁移、Nginx、Keycloak
├── deploy/k3s/                   K3s 清单和 Secret 样例
├── scripts/                     虚拟机部署辅助脚本
├── docs/                        中文项目文档及归档
├── Dockerfile                   开发与生产镜像构建入口
└── docker-compose*.yml          开发及生产 Compose 配置
```

本地构建输出位于各工作区的 `dist/`，PostgreSQL 数据保存在 Compose 命名卷中。

## 4. 安装、启动和验证

```sh
git clone --branch github-handoff https://github.com/lab-management-platform/lab-manage-platform.git
cd lab-manage-platform
git rev-parse HEAD
```

在仓库根目录复制开发配置。已有 `.env` 时保留原文件并核对本地参数。

- Linux：`cp .env.example .env`
- PowerShell：`Copy-Item .env.example .env`

```sh
docker compose up --build -d
docker compose ps
curl -f http://localhost:3000/health
```

成功时健康检查返回 HTTP 200，JSON 中的 `status` 为 `ok`。打开 `http://localhost:5173`，使用“平台账号登录”，用户名为 `admin`，开发密码取自 `.env` 的 `LAB_DEMO_ADMIN_PASSWORD`。验证能进入工作台并打开项目管理页面，空项目列表也是有效结果。开发配置需保持 `NODE_ENV=development`、`AUTH_MODE=local` 和 `LAB_SEED_DEMO_ACCOUNTS=true`。首次构建需要访问容器镜像仓库和 npm 源，默认端口为 5173、3000 和 5432。

如果本机占用或保留了默认端口，在 `.env` 中添加以下配置。如修改端口，浏览器和健康检查地址也相应改为 15173 和 13000。容器间数据库连接仍使用 `postgres:5432`。

```dotenv
DEV_WEB_PORT=15173
DEV_API_PORT=13000
DEV_POSTGRES_PORT=15432
```

需要恢复某次验收版本时，使用 `git checkout --detach <已记录的完整 Commit ID>`。

```sh
docker compose logs --tail=100 api web postgres
docker compose down
```

`down` 保留数据库卷。本地源码检查可在仓库根目录执行：

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

若容器构建时无法从 npm 下载依赖，可用本机 Node.js 运行已安装的工作区，并保留 Compose 提供的 PostgreSQL。下例为 PowerShell，沿用上面的备用端口。先执行上一段的安装及构建命令，再分别打开两个终端。

```powershell
# 终端 1，仓库根目录
$env:DEV_POSTGRES_PORT = '15432'
docker compose up -d --wait postgres
$env:DATABASE_URL = 'postgres://lab:lab_password@127.0.0.1:15432/lab_management'
$env:API_PORT = '13000'
$env:NODE_ENV = 'development'
$env:AUTH_MODE = 'local'
$env:LAB_SEED_DEMO_ACCOUNTS = 'true'
node apps/api/dist/src/main.js
```

```powershell
# 终端 2，仓库根目录
$env:VITE_API_BASE_URL = 'http://localhost:13000'
$env:VITE_AUTH_MODE = 'local'
corepack pnpm --filter @lab/web dev --host 127.0.0.1 --port 15173
```

打开 `http://localhost:15173`，并在 `http://localhost:13000/health` 检查 API。两个终端分别用 Ctrl+C 停止进程，随后运行 `docker compose down`。

生产环境的配置起点为 [`.env.production.example`](.env.production.example)、[`docker-compose.prod.yml`](docker-compose.prod.yml) 和 [`deploy/k3s/`](deploy/k3s/)。现有 K3s 发布流程见 [GitHub Actions 配置](.github/workflows/deploy-k3s.yml)，需要配置镜像仓库、域名、TLS、数据库及认证凭据。日常复现使用上面的开发 Compose。

## 5. 关键技术与接口

本地 API 基址为 `http://localhost:3000`。受保护接口传入 `Authorization: Bearer <token>`。

| 接口                      | 输入                        | 返回或作用                             |
| ------------------------- | --------------------------- | -------------------------------------- |
| `GET /health`             | 无                          | 运行状态、已加载插件和外部服务配置状态 |
| `POST /auth/login`        | JSON `username`、`password` | 登录令牌和用户角色                     |
| `POST /auth/registration` | 注册资料及密码              | 提交注册申请，审核通过后可登录         |
| `GET /projects`           | 登录令牌                    | 当前账号有权访问的项目列表             |
| `GET /projects/:id/tree`  | 项目 ID、登录令牌           | 项目树数据                             |

认证与插件初始化见 [API 内核入口](apps/api/src/kernel.ts)，路由与权限见 [API 入口](apps/api/src/main.ts) 和各插件的入口文件。详细资料见 [文档中心](docs/项目文档/文档中心.md) 及 [接口与数据契约](docs/项目文档/08-接口与数据契约.md)。本项目无 ROS 接口。

## 6. 数据与模型

无/不适用。基础运行不依赖项目数据集或自有模型权重。文件插件可选接入 Synology NAS，AI 功能可连接外部 API 或由运维单独配置 Ollama 模型。配置项见 [`.env.example`](.env.example)。

## 7. 已知限制与维护信息

- 本地演示覆盖平台账号和基础业务。Keycloak、厦大 CAS、NAS 和 AI 服务需按环境配置后分别联调。生产环境不会初始化开发演示账号。
- 维护联络：通过 GitHub 仓库的 Issues 反馈问题。
- 第三方依赖包括 React、Vite、Fastify、Lucide（ISC）、Mammoth（BSD-2-Clause）、PDF.js（Apache-2.0）。React、Vite 和 Fastify 使用 MIT 许可证。版本以锁文件为准，其他依赖按各包自带的 LICENSE 或包元数据查阅。部署镜像的来源与版本见 Dockerfile、Compose 和 K3s 清单。
- Git 协作沿用项目现有分支和审核流程。真实凭据、私钥、数据库导出和本地环境文件不得提交。
