# 角色与权限说明

适用对象：产品、权限设计者、后端与前端开发  
更新时间：2026-07-01  
关联文档：[代码规范](../05-engineering/code-style.md)、[API 总览](../04-api/api-overview.md)

## 1. 系统角色

共享类型中当前定义了 6 级角色：

| 角色         | 标识          | 说明                                   |
| ------------ | ------------- | -------------------------------------- |
| 学生         | `student`     | 项目执行、资料上传、申请提交、AI 使用  |
| 教授         | `professor`   | 项目指导、项目维护、会议与审批相关操作 |
| 实验室管理员 | `lab_admin`   | 全局业务管理与主要运维角色             |
| 普通成员     | `member`      | 兼容型角色，当前业务上接近受限成员     |
| 平台管理员   | `admin`       | 平台治理角色，权限上接近全局管理员     |
| 超级管理员   | `super_admin` | 最高治理角色，主要用于平台级保留能力   |

## 2. 当前运行时边界

需要特别注意：

- 前端共享类型和权限映射已包含 6 级角色
- 认证与注册主流程目前仍主要围绕 `student / professor / lab_admin`
- 因此文档上要区分：
  - 共享角色体系：6 级
  - 当前业务主用角色：学生、教授、实验室管理员

## 3. 权限集合

当前权限集合：

- `user:read`
- `user:write`
- `inventory:read`
- `inventory:apply`
- `inventory:approve`
- `inventory:stock`
- `file:read`
- `file:write`
- `project:read`
- `project:write`
- `project:progress`
- `meeting:read`
- `meeting:write`
- `ai:use`
- `ai:manage`

## 4. 主要角色能力摘要

| 能力                | student            | professor | lab_admin | admin / super_admin |
| ------------------- | ------------------ | --------- | --------- | ------------------- |
| 查看项目            | 是                 | 是        | 是        | 是                  |
| 修改项目            | 受项目成员角色限制 | 是        | 是        | 是                  |
| 上传进度 / 项目资料 | 是                 | 可        | 是        | 是                  |
| 审批耗材            | 否                 | 是        | 是        | 是                  |
| 创建会议 / 公告     | 否                 | 是        | 是        | 是                  |
| 管理知识库          | 否                 | 否        | 是        | 是                  |
| 管理用户            | 否                 | 受限      | 是        | 是                  |

## 5. 项目内成员角色

项目业务当前采用以下成员角色：

- `owner`：学生负责人
- `leader`：组内骨干成员
- `member`：普通组员
- `advisor`：导师
- `observer`：旁观/观察角色

当前项目模块和前端以这套角色为准。

## 6. 已知待统一点

- `packages/core/src/contracts.ts` 中仍保留旧版 `ProjectMember` 泛型定义
- `projects` 插件与前端已经使用新业务角色集
- 后续整合时，需要把共享契约中的项目成员角色也统一到 `owner / leader / member / advisor / observer`
