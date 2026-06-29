# 协作开发规范

## 分支建议

建议每个任务开独立分支：

```text
feature/inventory-export
feature/files-synology-api
fix/sse-refresh
docs/api-guide
```

## 提交前检查

```powershell
corepack pnpm run ci
```

CI 不通过不要合并。

## Commit 信息

使用 Conventional Commit：

```text
feat: add project plugin scaffold
fix: handle inactive user filtering
docs: update api usage guide
test: add files api integration test
```

常用类型：

- `feat`：新功能
- `fix`：修复
- `docs`：文档
- `test`：测试
- `refactor`：重构
- `chore`：工程配置

## 代码边界

- 核心组不要把业务规则写进 `packages/core`。
- 插件组不要直接改其他插件。
- 前端组新增接口调用前，确认 OpenAPI 已更新。
- 数据库表按模块 schema 隔离。
- 不提交 `.env`、证书、密码、NAS token。

## PR 描述模板

```md
## 做了什么

-

## 如何验证

- [ ] corepack pnpm run ci
- [ ] docker compose up --build -d
- [ ] 手动验证页面/接口：

## 影响范围

-

## 风险

-
```
