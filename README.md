# 实验管理平台开发



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin http://10.26.34.240:9080/dreamfactory-2026/kc/cdl.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](http://dockerGitlab-new/dreamfactory-2026/kc/cdl/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.

# 实验室管理平台

实验室管理平台用于管理实验室成员账号、耗材库存、领用审批、库存流水、文件资料和后续统一认证/NAS 适配。项目采用 Monorepo、TypeScript、React、Fastify、PostgreSQL、Docker Compose，架构上遵循“微内核 + 插件化”。

## 当前能力

- 登录：支持账号、学号/工号、手机号 + 密码登录
- 账号管理：管理员创建账号、搜索账号、显示停用账号、重置密码、停用学员、调整角色
- 角色权限：成员、管理员、超级管理员权限矩阵
- 耗材库存：库存列表、低库存提醒、入库登记
- 申请审批：成员提交耗材申请，管理员批准/拒绝
- 实时刷新：通过 SSE 接收申请和审批变化
- 库存流水：查询入库和审批出库记录
- 文件资料：文件夹、标签、权限、小文件直传、版本记录、Synology Drive 链接兼容
- AI 智能问答：LLM 对话、知识库 RAG 问答、FAQ 模板
- 会议通知：会议预约、会议完成标记、站内通知、全局公告
- 审计日志：关键动作写入 PostgreSQL
- 生产部署：Nginx、生产 Compose、环境变量、数据库迁移脚本

## 快速启动

本项目推荐使用 Docker Compose 运行开发环境。PostgreSQL 会由 Docker 自动启动，组员首次体验不需要单独安装 PostgreSQL。

### 1. 推荐安装目录

为避免 C 盘空间不足，建议提前准备这些目录：

```text
E:\Dependencies\DockerDesktop
E:\VirtualMachines\WSL
E:\VirtualMachines\DockerData
F:\program
```

目录只是示例，组员可以按自己电脑磁盘调整。不要把个人电脑的绝对路径写入项目文件，只在本机安装软件或配置环境变量时使用。

### 2. Windows 必备环境

建议使用 Windows 10/11 + WSL 2 + Docker Desktop。

用管理员 PowerShell 检查 WSL：

```powershell
wsl --version
wsl --status
```

如果提示没有 WSL，先安装或更新：

```powershell
wsl --update
wsl --set-default-version 2
```

如果需要安装 Ubuntu，并且希望放在非 C 盘，优先使用：

```powershell
wsl --install -d Ubuntu-24.04 --location "E:\VirtualMachines\WSL\Ubuntu-24.04"
```

如果你的 WSL 版本不支持 `--location`，可以先正常安装，再用导出/导入迁移到非 C 盘。注意：`--unregister` 会删除原发行版，迁移前确认已经导出成功。

```powershell
wsl --install -d Ubuntu-24.04
wsl --shutdown
wsl --export Ubuntu-24.04 "E:\VirtualMachines\WSL\Ubuntu-24.04.tar"
wsl --unregister Ubuntu-24.04
wsl --import Ubuntu-24.04 "E:\VirtualMachines\WSL\Ubuntu-24.04" "E:\VirtualMachines\WSL\Ubuntu-24.04.tar" --version 2
```

安装完成后进入 Ubuntu，创建 Linux 用户并设置密码。Docker Desktop 使用 WSL 2 后端时会自动和 WSL 集成。

### 3. 安装 Docker Desktop 到非 C 盘

从 Docker 官网下载 `Docker Desktop Installer.exe`。如果安装器支持命令行安装，可以用管理员 PowerShell 指定程序目录：

```powershell
Start-Process -Wait -FilePath "E:\Downloads\Docker Desktop Installer.exe" -ArgumentList 'install','--accept-license','--installation-dir=E:\Dependencies\DockerDesktop' -Verb RunAs
```

如果使用图形界面安装：

1. 勾选 `Use WSL 2 instead of Hyper-V`。
2. 一般不需要勾选 `Allow Windows Containers`。
3. 安装完成后重启电脑。
4. 打开 Docker Desktop，等待左下角显示 Docker Engine running。
5. 在 Docker Desktop 设置中检查 WSL Integration，启用当前 Ubuntu。

Docker Desktop 的程序目录和 Docker 镜像/容器数据目录不是一回事。程序可以装到 `E:\Dependencies\DockerDesktop`，镜像和容器数据建议在 Docker Desktop 设置里调整到非 C 盘：

```text
Docker Desktop -> Settings -> Resources -> Advanced -> Disk image location
```

可以设置为：

```text
E:\VirtualMachines\DockerData
```

不同 Docker Desktop 版本界面名称可能略有差异，核心目标是把 Docker data / disk image 放到非 C 盘。

### 4. 检查 Docker 命令

打开新的 PowerShell，执行：

```powershell
docker version
docker compose version
```

如果提示 `docker` 不是内部或外部命令，通常是 Docker Desktop 没有加入 PATH，或者终端打开得太早。先重启终端或电脑。

仍然找不到时，把 Docker Desktop 安装目录下的 `resources\bin` 加入 Windows 用户或系统环境变量 `Path`。例如你的 Docker 安装在：

```text
E:\Dependencies\DockerDesktop
```

则 PATH 中应包含：

```text
E:\Dependencies\DockerDesktop\resources\bin
```

不要在 README、代码或 compose 文件里写某个人电脑上的 Docker 绝对路径。

### 5. 获取项目代码

推荐把项目放在非 C 盘，例如：

```powershell
cd F:\program
git clone https://github.com/wusou/lab-management-platform.git
cd lab-management-platform
```

如果已经下载过项目：

```powershell
cd F:\program\lab-management-platform
git pull
```

如果你的上级目录叫 `managenment-platform` 或其他名字也没关系，只要进入项目根目录，也就是包含 `docker-compose.yml`、`package.json`、`apps`、`plugins` 的目录。

### 6. 配置环境变量

项目不包含 `.env` 文件（已 gitignore），首次使用需从模板创建：

```powershell
copy .env.example .env
```

开发环境开箱即用，无需修改即可启动。如需启用 AI 功能，编辑 `.env` 填入 API Key：

```bash
# 使用 DeepSeek（推荐，中文效果好）
AI_PROVIDER=openai
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=deepseek-v4-flash
```

详细配置见 [docs/AI_MODULE.md](./docs/AI_MODULE.md)。

> `.env` 包含密钥等敏感信息，**禁止提交到 git**。`.env.example` 是模板，不含真实密钥，可以提交。

### 7. 启动项目

首次启动或依赖变化后：

```powershell
docker compose up --build -d
```

查看容器状态：

```powershell
docker compose ps
```

正常应看到：

```text
api       running
web       running
postgres  healthy
```

访问地址：

- 前端：`http://localhost:5173`
- API：`http://localhost:3000`
- 健康检查：`http://localhost:3000/health`

开发环境种子账号：

```text
管理员：admin / Admin@123456
成员：student001 / Student@123456
```

这两个账号只在 `NODE_ENV=development` 且 `LAB_SEED_DEMO_ACCOUNTS` 未设置为 `false` 时自动初始化，方便本地演示和测试。登录页不会展示或自动填充默认账号；生产环境应设置 `LAB_SEED_DEMO_ACCOUNTS=false`，并通过初始化管理员、统一认证或管理员后台创建正式账号。

### 8. 更新代码后的启动方式

如果只是普通代码更新：

```powershell
git pull
docker compose up --build -d
```

如果新增了依赖、插件或容器内提示找不到包，刷新匿名依赖卷：

```powershell
docker compose up --build -d -V api web
```

如果数据库结构有更新，执行迁移：

```powershell
docker compose exec api pnpm --filter @lab/api db:migrate
```

### 9. 常见问题

`docker` 命令找不到：

- 确认 Docker Desktop 已启动。
- 重启 PowerShell。
- 检查 Docker Desktop 的 `resources\bin` 是否在 Windows `Path` 中。

无法连接 Docker API，提示 `dockerDesktopLinuxEngine`：

- Docker Desktop 还没启动完成。
- Docker Engine 没有运行。
- WSL 后端异常，尝试：

```powershell
wsl --shutdown
```

然后重新打开 Docker Desktop。

端口被占用：

- 前端默认端口：`5173`
- API 默认端口：`3000`
- PostgreSQL 默认端口：`5432`

可以先查看占用：

```powershell
netstat -ano | findstr :5173
netstat -ano | findstr :3000
netstat -ano | findstr :5432
```

容器一直不健康：

```powershell
docker compose logs -f postgres
docker compose logs -f api
docker compose logs -f web
```

页面还是旧版本：

```powershell
docker compose up --build -d -V api web
```

然后浏览器强制刷新。

想清空本地数据库重新初始化：

```powershell
docker compose down -v
docker compose up --build -d
```

注意：`down -v` 会删除本地 Docker volume 中的数据库数据，只适合开发环境。

## 常用命令

```powershell
corepack pnpm install
corepack pnpm dev
corepack pnpm run ci
corepack pnpm db:migrate
docker compose up --build -d
docker compose logs -f api
docker compose ps
```

项目文档和配置必须保持跨机器可用，不能提交个人电脑上的绝对安装路径。

## 项目结构

```text
lab-management-platform/
├── .github/
│   └── workflows/
│       └── ci.yml                         GitHub Actions CI
├── apps/
│   ├── api/                               Fastify API 宿主
│   │   ├── src/
│   │   │   ├── adapters.ts                外部适配器装配
│   │   │   ├── kernel.ts                  插件注册入口
│   │   │   ├── main.ts                    API 路由与服务启动
│   │   │   └── migrate.ts                 数据库迁移执行器
│   │   └── test/                          API 集成测试
│   └── web/                               React + Vite 前端
│       ├── src/
│       │   ├── main.tsx                   页面与交互入口
│       │   └── styles.css                 全局样式
│       └── index.html
├── docs/                                  项目文档
│   ├── API.md                             API 使用说明
│   ├── CONTRIBUTING.md                    协作规范
│   ├── DEPLOYMENT.md                      生产部署说明
│   ├── DEVELOPMENT.md                     开发指南
│   ├── FILE_STRUCTURE.md                  文件作用说明
│   ├── PROJECT_PROGRESS.md                项目进度
│   └── SYNOLOGY_DRIVE_ADAPTER.md          NAS 适配说明
├── infra/
│   ├── nginx/                             生产 Nginx 配置
│   └── postgres/                          数据库初始化与迁移 SQL
├── packages/
│   ├── contracts/                         OpenAPI 与共享契约
│   └── core/                              微内核：认证、权限、审计、事件、插件契约
├── plugins/
│   ├── collaboration/                     会议、公告、站内通知插件
│   ├── files/                             文件资料、权限、标签、版本与 NAS 链接插件
│   ├── hello-world/                       示例插件
│   └── inventory/                         耗材库存、申请审批、库存流水插件
├── .env.example                           开发环境变量模板
├── .env.production.example                生产环境变量模板
├── docker-compose.yml                     开发 Docker Compose
├── docker-compose.prod.yml                生产 Docker Compose
├── Dockerfile                             API/Web 多阶段构建
├── package.json                           根工作区脚本与依赖
├── pnpm-workspace.yaml                    pnpm workspace 配置
└── tsconfig.json                          TypeScript 工程引用
```

## 文档入口

- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)：开发环境、分工、如何新增模块
- [docs/API.md](./docs/API.md)：API 使用说明、认证方式、常用接口示例
- [docs/FILE_STRUCTURE.md](./docs/FILE_STRUCTURE.md)：文件和目录作用说明
- [docs/PROJECT_PROGRESS.md](./docs/PROJECT_PROGRESS.md)：已完成、未完成、下一步计划
- [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)：协作规范、提交规范、PR 模板
- [docs/plugin-template.md](./docs/plugin-template.md)：新增插件模板
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)：生产部署、Nginx、HTTPS、迁移
- [docs/SYNOLOGY_DRIVE_ADAPTER.md](./docs/SYNOLOGY_DRIVE_ADAPTER.md)：Synology Drive 后续适配说明
- [docs/AI_MODULE.md](./docs/AI_MODULE.md)：AI 模块接入指南、模型配置、知识库管理

## 架构原则

- 核心只提供认证、权限、审计、事件、插件生命周期，不写业务规则。
- 业务能力放在 `plugins/*`，插件之间不直接导入对方代码。
- 模块通信通过 HTTP API、TypeScript 契约或事件，不直接共享数据库表。
- 数据库按 schema 隔离，例如 `core`、`inventory`、`files`。
- 合并代码前必须跑 `corepack pnpm run ci`。
