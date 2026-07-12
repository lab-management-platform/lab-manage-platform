# 仓库层次结构

适用对象：新维护者、跨组开发者、代码审查者  
更新时间：2026-07-01  
关联文档：[模块划分与文件映射](./module-map.md)、[开发指南](../05-engineering/development-guide.md)

以下目录树已排除 `node_modules`、`dist`、缓存与本地协作文档等噪音产物。

```text
lab-management-platform-migrate-temp/
├── .github/
│   └── workflows/
├── .husky/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   └── web/
│       ├── public/
│       ├── scripts/
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   ├── pages/
│       │   │   ├── projects/
│       │   │   └── shared/
│       │   ├── config/
│       │   ├── hooks/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
├── docs/
│   ├── 00-overview/
│   ├── 01-product/
│   ├── 02-architecture/
│   ├── 03-data/
│   ├── 04-api/
│   ├── 05-engineering/
│   └── 06-delivery/
├── infra/
│   ├── nginx/
│   └── postgres/
├── packages/
│   ├── contracts/
│   │   ├── openapi/
│   │   └── src/
│   └── core/
│       └── src/
├── plugins/
│   ├── ai/
│   ├── collaboration/
│   ├── files/
│   ├── hello-world/
│   ├── inventory/
│   └── projects/
├── scripts/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

## 目录说明

- `apps/`：运行入口，包含 API 宿主和 Web 应用
- `packages/`：共享能力与共享契约
- `plugins/`：业务实现主体
- `infra/`：基础设施配置
- `docs/`：公共文档中心
- `scripts/`：辅助脚本，不是业务主线
