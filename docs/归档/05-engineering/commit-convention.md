# 提交规范

适用对象：所有提交者、代码评审者、CI 维护者  
更新时间：2026-07-01  
关联文档：[开发指南](./development-guide.md)

## 1. Commit 规范

项目采用 Conventional Commit。

当前允许的类型：

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `test`
- `build`
- `ci`
- `chore`

示例：

```text
feat: add project tree snapshot preview
fix: stabilize project tree sorting after drag and demote
docs: rebuild documentation center for cross-team integration
```

## 2. 提交前检查

```powershell
corepack pnpm run ci
```

## 3. Pull Request 建议内容

- 做了什么
- 如何验证
- 影响范围
- 风险与兼容性说明
- 文档是否已同步

## 4. 文档型变更要求

如果改动影响以下任一项，应同步更新公共文档：

- 角色与权限
- 接口
- 数据表
- 目录结构
- 启动方式
- 协作规范
