# Synology Drive 文件模块适配说明

当前文件模块已经提供可用的第一版能力：在平台中登记、查询、打开 Synology Drive 共享链接。真实 NAS 上传/目录同步需要拿到 NAS 管理信息后再接入。

## 当前已实现

- 插件：`plugins/files`
- API：
  - `GET /files`
  - `POST /files`
- 前端页面：`文件资料`
- 存储表：`files.lab_file`
- 审计动作：`files.document.registered`

当前模式不保存文件二进制，只保存：

- 标题
- 分类：`sop`、`template`、`record`、`other`
- Synology Drive 共享链接
- 说明
- 登记人
- 登记时间

## 之后接真实 Synology Drive 需要的材料

向 NAS 管理员或老师确认：

- NAS 访问地址，例如 `https://nas.example.com:5001`
- 是否启用 HTTPS
- 是否可创建专用服务账号
- 服务账号用户名
- 服务账号密码或应用专用 token
- 允许访问的 Team Folder / 共享文件夹名称
- 根目录，例如 `/实验室管理平台`
- 是否允许通过 API 上传、删除、创建分享链接
- 文件大小限制
- 校内/校外访问策略

## 建议申请内容

建议不要使用个人账号接入系统，向老师申请一个专用账号：

```text
账号用途：实验室管理平台文件资料模块
权限范围：仅访问指定共享文件夹
权限级别：按需读写，不授予 NAS 管理员权限
访问方式：Synology Drive / File Station API
```

## 未来替换点

未来接真实 NAS 时，只需要替换 `plugins/files/src/index.ts` 中的 repository：

```text
MemoryFileRepository
PostgresFileRepository
SynologyDriveRepository  <- 后续新增
```

核心平台和前端不需要知道 NAS 细节，仍然通过 `/files` API 调用。

## 推荐环境变量

```text
SYNOLOGY_BASE_URL=https://nas.example.com:5001
SYNOLOGY_USERNAME=lab-platform
SYNOLOGY_PASSWORD=change-me
SYNOLOGY_TEAM_FOLDER=实验室资料
SYNOLOGY_ROOT_PATH=/实验室管理平台
```

这些变量不要提交到 Git，只放在 `.env` 或 `.env.production`。
