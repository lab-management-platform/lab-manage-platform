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

实验室管理平台是一个面向高校实验室的项目制协作系统，围绕“项目”串联账号权限、耗材管理、文件资料、会议通知和 AI 助手。项目采用 Monorepo 结构，后端使用 Fastify + PostgreSQL，前端使用 React + Vite，整体遵循“微内核 + 插件化”架构。

## 当前状态

- 已可本地启动并演示完整主流程
- 已支持三级角色：`student`、`professor`、`lab_admin`
- 已完成前端模块化重构，不再是一页式长工作台
- 项目插件已接入，跨模块的 `project_id` 关联仍在持续完善

## 核心能力

- 账号登录、找回密码、角色分级、账号管理
- 项目管理、任务、成员、进度纪要
- 耗材目录、领用申请、审批、入库、库存流水
- 文件资料、版本记录、外链资料兼容
- 会议预约、通知、公告
- AI 对话、FAQ、知识库管理

## 快速启动

### 1. 准备环境

- Node.js 20+
- pnpm 9+
- Docker Desktop

建议复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

### 2. 启动开发环境

首次启动、依赖变化、`Dockerfile` 变化，或你不确定容器当前状态时：

```powershell
docker compose up --build -d
docker compose ps
```

这两个命令的职责不同：

- `docker compose up --build -d`
  - 作用：构建镜像并在后台启动开发环境
  - 适用场景：
    - 第一次拉下仓库后启动
    - `Dockerfile`、`docker-compose.yml`、`package.json`、锁文件、依赖安装策略变了
    - 需要重新构建镜像层
  - 特点：最重，但最稳；不是每次改前端文件都要执行
- `docker compose ps`
  - 作用：只查看容器是否正常运行
  - 适用场景：
    - 启动后确认 `api / web / postgres` 是否都在线
    - 排查端口是否正常暴露
  - 特点：只读，不会重启、不会重建、不会刷新代码

日常前端开发时：

- 修改 `apps/web/src/*`、`apps/web/src/styles.css` 这类前端源码
  - 正常情况下应由 Vite 自动热更新
  - 不需要重新 `docker build`
- 如果改了前端监听配置、`docker-compose.yml`、Vite 配置，执行：

```powershell
docker compose restart web
```

这个命令的作用和场景：

- 只重启 `web` 容器
- 适合让新的环境变量、监听配置、Vite 配置立即生效
- 比 `docker compose up --build -d` 轻很多

查看开发服务日志：

```powershell
docker compose logs -f web
docker compose logs -f api
```

区别：

- `logs -f web`
  - 看前端 Vite dev server 是否启动成功
  - 看热更新、编译报错、端口监听是否正常
- `logs -f api`
  - 看后端接口、插件注册、数据库连接、接口报错

如果你只改了前端文件，但浏览器刷新后没有变化：

1. 先执行 `docker compose ps`
2. 再执行 `docker compose logs -f web`
3. 如果 `web` 服务正常但热更新没反应，执行：

```powershell
docker compose restart web
```

4. 若仍异常，再执行：

```powershell
docker compose up --build -d web
```

补充说明：

- 本仓库的 `web` 服务默认跑的是 `Vite dev server`，不是静态构建产物
- 因此前端页面开发的正常体验应该是“改源码即刷新”
- 只有镜像层、依赖、容器配置变动时，才需要重新 `build`

默认地址：

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

### 3. 演示账号

```text
实验室管理员：admin / Admin@123456
教授：professor / Professor@123456
学生：student001 / Student@123456
```

## 常用命令

```powershell
corepack pnpm run ci
corepack pnpm --filter @lab/web typecheck
docker compose up --build -d
docker compose restart web
docker compose logs -f web
docker compose logs -f api
docker compose exec api pnpm --filter @lab/api db:migrate
```

## 仓库结构

```text
lab-management-platform/
├── apps/
│   ├── api/                Fastify API 宿主
│   └── web/                React + Vite 前端
├── docs/                   项目文档
├── infra/                  Nginx / PostgreSQL 基础设施配置
├── packages/
│   ├── contracts/          OpenAPI 与共享契约
│   └── core/               微内核：认证、权限、事件、审计
├── plugins/                业务插件
├── docker-compose.yml      开发环境
├── docker-compose.prod.yml 生产环境
└── CLAUDE.md               AI 协同开发上下文
```

## 文档入口

- [docs/README.md](./docs/README.md): 文档总索引
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md): 开发与代码组织
- [docs/API.md](./docs/API.md): 常用 API 说明
- [docs/DATABASE.md](./docs/DATABASE.md): 数据库 schema 与关键表
- [docs/PERMISSION_MATRIX.md](./docs/PERMISSION_MATRIX.md): 角色与权限范围
- [docs/PROJECT_PROGRESS.md](./docs/PROJECT_PROGRESS.md): 当前进度与待办
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md): 生产部署说明
- [docs/AI_MODULE.md](./docs/AI_MODULE.md): AI 模块接入与配置
- [docs/plugin-template.md](./docs/plugin-template.md): 新增插件模板

## 开发约定

- 业务规则写在 `plugins/*`，不要写进 `packages/core`
- OpenAPI 变更以 `packages/contracts/openapi/core-api.yaml` 为准
- 提交前运行 `corepack pnpm run ci`
- 不提交 `.env`、证书、真实密钥或个人机器绝对路径
