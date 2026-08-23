# 注册审批流程完善设计（2026-08-23）

## 1. 背景与目标

当前 `dev` 分支已实现"个人注册 + 管理员审核"的完整后端链路（数据库字段、契约方法、公开注册接口、待审核列表、审核接口），但存在以下不完整点：

1. 纯 `local` 认证模式下前端没有注册入口（注册表单只在 `OidcLogin` 组件中，而 `local` 模式渲染的是 `LoginForm`）。
2. 用户提交注册申请后无法查询审核状态，被驳回也看不到原因（驳回原因仅存库，前端不展示给申请人）。
3. "忘记密码"是占位实现，提交后仅提示联系管理员，不能自助重置。
4. `DemoAuthAdapter`（演示/测试环境）未实现注册审批相关方法，`listPendingRegistrations` 返回空、`reviewRegistration` 抛错。

目标：在 `dev` 分支基础上补齐上述缺口，使注册审批在 `local`、`hybrid` 两种模式下前后端闭环可用，并让演示/测试环境（无数据库）同样可跑通完整流程。

## 2. 范围

### 2.1 在本设计范围内

- 前端注册入口（`LoginForm` 接入注册与状态查询，`OidcLogin` 复用共享面板）。
- 注册申请状态查询接口（公开）与前端"查询我的申请状态"。
- 自助重置密码接口（公开）与前端真实找回密码表单。
- 审核驳回原因输入与申请人可见。
- `DemoAuthAdapter` 补齐注册审批、状态查询、密码重置。
- 集成测试覆盖完整注册审批链路。

### 2.2 不在本设计范围内

- 短信/邮件验证码服务（自助重置采用"账号/学号 + 绑定手机号"两要素校验，不发送验证码）。
- 公共注册开放教师/管理员角色（保持只允许 `student`，教师与实验室管理员仍由管理员后台创建）。
- Keycloak / CAS 密码体系改动（外部身份提供商的密码找回不由本系统处理）。
- 新数据库迁移（`005_registration_approval.sql` 已包含全部所需字段）。

## 3. 现状梳理

### 3.1 已有实现（dev 分支）

- `core.app_user` 已有 `approval_status`（pending/approved/rejected）、`approval_requested_at`、`approved_at`、`approved_by`、`rejection_reason` 字段。
- 契约层：`ApprovalStatus`、`PublicRegistrationRequest`、`ManagedUser.approvalStatus`、`AuthPort.submitRegistration / listPendingRegistrations / reviewRegistration / loginExternal`。
- 后端接口：
  - `POST /auth/registration`（公开）：创建 `role=student`、`active=false`、`approval_status=pending` 的用户，返回 202。
  - `GET /auth/registrations/pending`（需 `user:write`）：待审核列表。
  - `PATCH /auth/registrations/:id`（需 `user:write`）：`action=approve|reject` + `remark`。
- 登录（本地与外部）均要求 `approval_status='approved' AND active=true`。
- 前端：`OidcLogin` 内嵌注册表单；`AccountsPage` 有待审核卡片（驳回原因硬编码）；`LoginForm` 有假的找回密码表单。

### 3.2 需要修复的问题

| # | 问题 | 修复方案 |
| - | ---- | -------- |
| 1 | `local` 模式无注册入口 | 抽取共享注册面板，`LoginForm` 增加"个人注册 / 申请加入" |
| 2 | 用户无法查询审核状态/原因 | 新增公开状态查询接口 + 前端查询表单 |
| 3 | 找回密码为占位 | 新增公开密码重置接口 + 前端真实表单 |
| 4 | 驳回原因硬编码 | 管理员审核时输入原因，查询接口返回原因 |
| 5 | `DemoAuthAdapter` 不支持注册审批 | 内存版补齐全部方法 |

## 4. 设计

### 4.1 契约层（`packages/core/src/contracts.ts`）

新增类型与 `AuthPort` 方法（均定义为可选，保持向后兼容）：

```ts
export interface RegistrationStatusResult {
  status: ApprovalStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface PasswordResetRequest {
  username: string;     // 账号或学号/工号
  identityNo: string;
  phone: string;
  newPassword: string;
}

// AuthPort 新增：
queryRegistrationStatus?(username: string, identityNo: string): Promise<RegistrationStatusResult | null>;
resetPassword?(request: PasswordResetRequest): Promise<void>;
```

### 4.2 后端接口（`apps/api/src/main.ts`）

```text
POST /auth/registration/status   # 公开：查询申请状态
  入参 { username, identityNo }
  200 { status, submittedAt, reviewedAt?, rejectionReason? }
  404 { error: "registration not found" }        # 两要素不匹配，不泄露信息

POST /auth/password/reset       # 公开：自助重置密码
  入参 { username, identityNo, phone, newPassword }
  200 { ok: true }
  400/404 { error }                              # 身份不匹配或密码不符合要求
```

两个接口均为公开（无需登录），无 `user:read`/`user:write` 权限要求。

### 4.3 适配器实现（`packages/core/src/auth.ts`）

#### PostgresAuthAdapter

- `queryRegistrationStatus(username, identityNo)`：
  - 按 `username = $1 OR identity_no = $1` 且 `identity_no = $2` 查询。
  - 返回 `approval_status`、`approval_requested_at`、`approved_at`、`rejection_reason`；无匹配返回 `null`。
- `resetPassword(request)`：
  - 校验新密码长度 ≥ 8。
  - 按账号/学号 + 学号 + 手机号 + `active=true` + `approval_status='approved'` 匹配用户。
  - 仅允许 `identity_provider='local'` 的用户。
  - 更新 `password_hash`，并删除该用户已有 session（强制重新登录）。
  - 任一项不匹配返回 null → 上层 404（不区分具体原因，避免账号枚举）。

#### DemoAuthAdapter

- 内存用户增加 `approvalStatus`、`approvalRequestedAt`、`approvedAt`、`rejectionReason` 字段（默认 `approved`）。
- `submitRegistration`：校验后创建 `pending` 用户（与 Postgres 行为一致）。
- `listPendingRegistrations`：返回 `approvalStatus === "pending"` 的用户。
- `reviewRegistration`：`approve` → `approved` + `active=true`；`reject` → `rejected` + `rejectionReason`；非 pending 抛错。
- `queryRegistrationStatus`、`resetPassword`：与 Postgres 语义一致（内存实现）。

#### HybridAuthAdapter

- 透传新增方法到 `local`（PostgresAuthAdapter）。

### 4.4 前端

#### 共享组件 `apps/web/src/components/auth/PublicRegistrationPanel.tsx`（新建）

- 包含两个视图：`register`（申请加入表单）与 `status`（查询申请状态表单）。
- 注册表单字段：登录名、姓名、学号、手机号（可选）、密码（≥ 8 位）。
- 状态查询表单字段：账号/学号、学号。
- 提交成功后展示后端返回消息，并提示可查询状态。
- 状态查询结果展示：待审核 / 已通过 / 已驳回（含驳回原因）。
- 纯展示组件风格与现有 `LoginForm` 一致，内部自管理状态并直接调用 `apiBase`。

#### `apps/web/src/components/LoginForm.tsx`

- 登录面板底部增加"个人注册 / 申请加入"入口。
- 保留现有 `resetMode`，将假的找回密码表单替换为真实表单（账号/学号、手机号、新密码、确认密码），提交调用 `/auth/password/reset`。
- 注册入口与找回密码入口均可在登录面板内切换回登录。

#### `apps/web/src/components/OidcLogin.tsx`

- 移除内嵌注册表单实现，改为渲染共享 `PublicRegistrationPanel`（行为不变）。

#### `apps/web/src/components/pages/AccountsPage.tsx`

- 驳回操作改为弹窗/输入驳回原因（`window.prompt` 或表单字段），不再硬编码。

#### `apps/web/src/components/App.tsx`

- `resetPassword` 函数由占位提示改为调用 `/auth/password/reset`。
- 无其他结构变更（`LoginForm` 内部管理注册/状态查询视图）。

### 4.5 数据流

```text
申请人                         后端                             管理员
  |  注册表单                      |                                 |
  |-- POST /auth/registration -->  | INSERT pending 用户 (202)       |
  |<-- 202 + "等待审核" ----------  |                                 |
  |                                |                    GET /auth/registrations/pending (user:write)
  |                                |<-------------------------------- |
  |                                |  待审核列表                       |
  |                                |    PATCH /auth/registrations/:id { action, remark }
  |                                |<-------------------------------- |
  |                                |  approve → active=true          |
  |-- POST /auth/registration/status -> 查询状态                       |
  |<-- { status: approved } ------ |                                 |
  |-- POST /auth/login ----------> | 仅 approved + active 可登录      |
```

### 4.6 错误处理

| 场景 | 状态码 | 说明 |
| ---- | ------ | ---- |
| 注册：用户名/学号/手机号重复 | 409 | `username, identityNo or phone already exists` |
| 注册：字段缺失或格式错误 | 400 | 复用现有校验 |
| 状态查询：两要素不匹配 | 404 | `registration not found` |
| 重置：身份不匹配 | 404 | `user not found or contact information does not match` |
| 重置：新密码 < 8 位 | 400 | `newPassword must be at least 8 characters` |
| 重置：外部身份提供商账号 | 400 | `password is managed by identity provider` |
| 审核：目标非 pending | 404 | `pending registration not found` |

### 4.7 测试计划（`apps/api/test/api.integration.test.ts`）

新增用例（测试环境走 `DemoAuthAdapter`，因此必须先在内存适配器补齐能力）：

1. 公开注册 → 202，返回 `{ id, status: "pending" }`。
2. 待审核账号登录 → 401。
3. 管理员查询待审核列表 → 包含新申请。
4. 管理员批准 → 200；该账号登录成功。
5. 第二个申请被驳回（带原因）→ 登录失败；状态查询返回 `rejected` + 原因。
6. 状态查询：不匹配的账号/学号 → 404。
7. 自助重置密码：重置后旧密码登录失败、新密码登录成功。
8. 重置时手机号不匹配 → 404。

### 4.8 文档更新

- 本设计文档：`docs/superpowers/specs/2026-08-23-registration-improvements-design.md`。
- 项目文档 `docs/项目文档/08-接口与数据契约.md` 增加认证相关接口说明。

## 5. 验收标准

- `local` 与 `hybrid` 模式登录页均可进入注册表单并成功提交申请。
- 管理员可对待审核申请批准/驳回（驳回可填写原因）。
- 申请人可查询自己的审核状态与驳回原因。
- 待审核/被驳回账号无法登录。
- 自助重置密码后旧密码失效、新密码可登录。
- `pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过。
