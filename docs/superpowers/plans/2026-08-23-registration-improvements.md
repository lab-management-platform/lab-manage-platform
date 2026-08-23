# 注册审批完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 dev 分支已有的"个人注册 + 管理员审核"基础上，补齐 local 模式注册入口、申请状态查询、自助重置密码、驳回原因展示，并让 Demo 适配器完整支持注册审批。

**Architecture:** 后端在 `@lab/core` 的 `AuthPort` 契约上增加 `queryRegistrationStatus` 与 `resetPassword` 两个可选方法，由 `DemoAuthAdapter`（内存）、`PostgresAuthAdapter`（SQL）和 `HybridAuthAdapter`（透传）分别实现；`apps/api` 暴露两个公开路由；前端抽出共享的 `PublicRegistrationPanel` 组件，`LoginForm` 与 `OidcLogin` 复用，并把找回密码表单改为真实调用。

**Tech Stack:** TypeScript 5.7、Fastify 5、React 19 + Vite 6、PostgreSQL 16、vitest 2、pnpm workspace。

**工作目录:** `D:\mywork\lab-manage-platform`，当前分支 `feat/registration-improvements`（基于 `origin/dev`）。

---

### Task 0: 准备环境

**Files:**
- 不修改代码，仅安装依赖

- [ ] **Step 1: 安装依赖**

Run: `corepack pnpm install`
Expected: 完成安装，无报错（node_modules 当前不存在，首次安装约 1-3 分钟）。

- [ ] **Step 2: 确认基线测试通过**

Run: `corepack pnpm --filter @lab/api test`
Expected: 2 个测试文件全部 PASS。

---

### Task 1: 契约层扩展

**Files:**
- Modify: `packages/core/src/contracts.ts`

- [ ] **Step 1: 添加状态查询与密码重置类型**

在 `packages/core/src/contracts.ts` 的 `export type ApprovalStatus = "pending" | "approved" | "rejected";` 之后、`export type Permission` 之前，插入：

```ts
export interface RegistrationStatusResult {
  status: ApprovalStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface PasswordResetRequest {
  username: string;
  identityNo: string;
  phone: string;
  newPassword: string;
}
```

- [ ] **Step 2: 在 AuthPort 中添加两个可选方法**

在 `AuthPort` 的 `reviewRegistration?` 方法之后、`listUsers?` 之前，插入：

```ts
  queryRegistrationStatus?(
    username: string,
    identityNo: string
  ): Promise<RegistrationStatusResult | null>;
  resetPassword?(request: PasswordResetRequest): Promise<void>;
```

- [ ] **Step 3: 类型检查**

Run: `corepack pnpm --filter @lab/core typecheck`
Expected: PASS（AuthPort 新方法为可选，现有适配器不报错）。

- [ ] **Step 4: 提交**

```bash
git add packages/core/src/contracts.ts
git commit -m "feat: extend auth contract with registration status and password reset"
```

---

### Task 2: 编写集成测试（红灯）

**Files:**
- Modify: `apps/api/test/api.integration.test.ts`

- [ ] **Step 1: 在文件末尾（最后一个 `it` 之后、`});` 之前）添加两个测试用例**

```ts
  it("supports public registration, admin approval and login", async () => {
    const suffix = Date.now();
    const username = `reg${suffix}`;
    const identityNo = `REG${suffix}`;
    const password = "Student@123456";
    const phone = "13800138000";

    const submitted = await app.inject({
      method: "POST",
      url: "/auth/registration",
      payload: {
        username,
        password,
        identityType: "student_no",
        identityNo,
        displayName: `注册测试${suffix}`,
        phone,
        reason: "integration test"
      }
    });
    expect(submitted.statusCode).toBe(202);
    expect(submitted.json<{ status: string }>().status).toBe("pending");

    const loginBefore = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username, password }
    });
    expect(loginBefore.statusCode).toBe(401);

    const pending = await app.inject({
      method: "GET",
      url: "/auth/registrations/pending",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(pending.statusCode).toBe(200);
    const pendingUser = pending
      .json<Array<{ id: string; username: string }>>()
      .find((user) => user.username === username);
    expect(pendingUser).toBeTruthy();

    const approved = await app.inject({
      method: "PATCH",
      url: `/auth/registrations/${pendingUser!.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: "approve" }
    });
    expect(approved.statusCode).toBe(200);

    const loginAfter = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username, password }
    });
    expect(loginAfter.statusCode).toBe(200);

    const status = await app.inject({
      method: "POST",
      url: "/auth/registration/status",
      payload: { username, identityNo }
    });
    expect(status.statusCode).toBe(200);
    expect(status.json<{ status: string }>().status).toBe("approved");
  });

  it("supports rejection with reason, status query and password reset", async () => {
    const suffix = Date.now() + 1;
    const rejectedUsername = `rej${suffix}`;
    const rejectedNo = `REJ${suffix}`;
    const password = "Student@123456";
    const rejectedPhone = "13800138001";

    const rejectedSubmit = await app.inject({
      method: "POST",
      url: "/auth/registration",
      payload: {
        username: rejectedUsername,
        password,
        identityType: "student_no",
        identityNo: rejectedNo,
        displayName: "驳回测试",
        phone: rejectedPhone
      }
    });
    expect(rejectedSubmit.statusCode).toBe(202);
    const rejectedId = rejectedSubmit.json<{ id: string }>().id;

    const rejected = await app.inject({
      method: "PATCH",
      url: `/auth/registrations/${rejectedId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: "reject", remark: "学号信息不完整" }
    });
    expect(rejected.statusCode).toBe(200);

    const loginRejected = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: rejectedUsername, password }
    });
    expect(loginRejected.statusCode).toBe(401);

    const rejectedStatus = await app.inject({
      method: "POST",
      url: "/auth/registration/status",
      payload: { username: rejectedUsername, identityNo: rejectedNo }
    });
    expect(rejectedStatus.statusCode).toBe(200);
    expect(rejectedStatus.json<{ status: string; rejectionReason: string }>()).toEqual(
      expect.objectContaining({ status: "rejected", rejectionReason: "学号信息不完整" })
    );

    const notFoundStatus = await app.inject({
      method: "POST",
      url: "/auth/registration/status",
      payload: { username: rejectedUsername, identityNo: "NOPE-999" }
    });
    expect(notFoundStatus.statusCode).toBe(404);

    const resetUsername = `psw${suffix}`;
    const resetNo = `PSW${suffix}`;
    const resetPhone = "13800138002";
    const registered = await app.inject({
      method: "POST",
      url: "/auth/registration",
      payload: {
        username: resetUsername,
        password,
        identityType: "student_no",
        identityNo: resetNo,
        displayName: "重置测试",
        phone: resetPhone
      }
    });
    expect(registered.statusCode).toBe(202);
    const resetId = registered.json<{ id: string }>().id;
    await app.inject({
      method: "PATCH",
      url: `/auth/registrations/${resetId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: "approve" }
    });

    const reset = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: {
        username: resetUsername,
        identityNo: resetNo,
        phone: resetPhone,
        newPassword: "NewPass@123456"
      }
    });
    expect(reset.statusCode).toBe(200);

    const oldLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: resetUsername, password }
    });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: resetUsername, password: "NewPass@123456" }
    });
    expect(newLogin.statusCode).toBe(200);

    const badReset = await app.inject({
      method: "POST",
      url: "/auth/password/reset",
      payload: {
        username: resetUsername,
        identityNo: resetNo,
        phone: "13900139000",
        newPassword: "OtherPass@123456"
      }
    });
    expect(badReset.statusCode).toBe(404);
  });
```

- [ ] **Step 2: 运行测试确认失败（红灯）**

Run: `corepack pnpm --filter @lab/api test`
Expected: 新增用例 FAIL（`/auth/registration/status` 与 `/auth/password/reset` 返回 404，状态查询/重置断言不通过；注册审核用例中 `GET /auth/registrations/pending` 目前返回空列表也会失败）。现有用例仍 PASS。

---

### Task 3: DemoAuthAdapter 补齐

**Files:**
- Modify: `packages/core/src/auth.ts`

- [ ] **Step 1: 扩展 import**

把文件顶部的 import 改为包含新类型：

```ts
import type {
  Actor,
  AuthPort,
  IdentityType,
  LocalUserRegistrationRequest,
  ManagedUser,
  PublicRegistrationRequest,
  ApprovalStatus,
  PasswordResetRequest,
  Permission,
  RegistrationStatusResult,
  Role
} from "./contracts.js";
```

- [ ] **Step 2: 扩展 DemoUser 接口**

把 `interface DemoUser` 替换为：

```ts
interface DemoUser {
  id: string;
  username: string;
  identityType: IdentityType;
  identityNo: string;
  phone?: string;
  displayName: string;
  role: Role;
  passwordHash: string;
  approvalStatus: ApprovalStatus;
  approvalRequestedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}
```

- [ ] **Step 3: 给三个演示账号补字段**

`demoUsers` 数组中每个对象（`u-admin`、`u-prof001`、`u-student001`）在 `passwordHash: ""` 之后添加：

```ts
    approvalStatus: "approved",
    createdAt: "2026-07-01T00:00:00.000Z"
```

- [ ] **Step 4: 更新 toManagedUser**

把 `toManagedUser` 函数体替换为：

```ts
function toManagedUser(user: DemoUser): ManagedUser {
  return {
    id: user.id,
    username: user.username,
    identityType: user.identityType,
    identityNo: user.identityNo,
    phone: user.phone,
    displayName: user.displayName,
    role: user.role,
    identityProvider: "local",
    active: user.approvalStatus === "approved",
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt
  };
}
```

- [ ] **Step 5: login 增加审核校验**

把 `DemoAuthAdapter.login` 的 find 条件改为：

```ts
    const user = this.users.find(
      (item) =>
        item.approvalStatus === "approved" &&
        verifyPassword(password, item.passwordHash) &&
        [item.username, item.identityNo, item.phone].some((value) => value === username)
    );
```

- [ ] **Step 6: registerLocalUser 补字段**

把 `registerLocalUser` 中创建的 `user` 对象改为：

```ts
    const user = {
      id: `u-${request.username}`,
      username: request.username,
      identityType: request.identityType,
      identityNo: request.identityNo,
      displayName: request.displayName,
      role: request.role,
      passwordHash: hashPassword(request.password),
      approvalStatus: "approved" as const,
      createdAt: new Date().toISOString()
    };
```

- [ ] **Step 7: submitRegistration 记录申请时间**

把 `submitRegistration` 中创建的 `user` 对象改为：

```ts
    const user: DemoUser = {
      id: `u-${request.username}`,
      username: request.username,
      identityType: request.identityType,
      identityNo: request.identityNo,
      phone: request.phone,
      displayName: request.displayName,
      role: "student",
      passwordHash: hashPassword(request.password),
      approvalStatus: "pending",
      approvalRequestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
```

- [ ] **Step 8: 实现 listPendingRegistrations 与 reviewRegistration**

把现有的两个空实现替换为：

```ts
  async listPendingRegistrations(): Promise<ManagedUser[]> {
    return this.users
      .filter((user) => user.approvalStatus === "pending")
      .map((user) => toManagedUser(user));
  }

  async reviewRegistration(
    targetUserId: string,
    action: "approve" | "reject",
    reviewerId: string,
    remark = ""
  ): Promise<ManagedUser> {
    const user = this.users.find((item) => item.id === targetUserId);
    if (!user || user.approvalStatus !== "pending") {
      throw new Error("pending registration not found");
    }
    void reviewerId;
    user.approvalStatus = action === "approve" ? "approved" : "rejected";
    user.approvedAt = new Date().toISOString();
    user.rejectionReason = action === "reject" ? remark : undefined;
    return toManagedUser(user);
  }
```

- [ ] **Step 9: 新增 queryRegistrationStatus 与 resetPassword**

在 `reviewRegistration` 之后、`listUsers` 之前插入：

```ts
  async queryRegistrationStatus(
    username: string,
    identityNo: string
  ): Promise<RegistrationStatusResult | null> {
    const user = this.users.find(
      (item) =>
        item.identityNo === identityNo &&
        [item.username, item.identityNo].some((value) => value === username)
    );
    if (!user) {
      return null;
    }
    return {
      status: user.approvalStatus,
      submittedAt: user.approvalRequestedAt ?? user.createdAt,
      reviewedAt: user.approvedAt,
      rejectionReason: user.rejectionReason
    };
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    if (request.newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }
    const user = this.users.find(
      (item) =>
        item.approvalStatus === "approved" &&
        [item.username, item.identityNo].some((value) => value === request.username) &&
        item.identityNo === request.identityNo &&
        item.phone === request.phone
    );
    if (!user) {
      throw new Error("user not found or contact information does not match");
    }
    user.passwordHash = hashPassword(request.newPassword);
    for (const [token, session] of this.sessions.entries()) {
      if (session.id === user.id) {
        this.sessions.delete(token);
      }
    }
  }
```

- [ ] **Step 10: 类型检查**

Run: `corepack pnpm --filter @lab/core typecheck`
Expected: PASS。

- [ ] **Step 11: 提交**

```bash
git add packages/core/src/auth.ts
git commit -m "feat: complete registration approval in demo auth adapter"
```

---

### Task 4: PostgresAuthAdapter 与 HybridAuthAdapter 补齐

**Files:**
- Modify: `packages/core/src/auth.ts`

- [ ] **Step 1: PostgresAuthAdapter 新增 queryRegistrationStatus**

在 `PostgresAuthAdapter.reviewRegistration` 方法之后、`authenticate` 方法之前插入：

```ts
  async queryRegistrationStatus(
    username: string,
    identityNo: string
  ): Promise<RegistrationStatusResult | null> {
    const result = await this.pool.query<{
      approval_status: ApprovalStatus;
      approval_requested_at: string | null;
      approved_at: string | null;
      rejection_reason: string | null;
      created_at: string;
    }>(
      `SELECT approval_status, approval_requested_at, approved_at, rejection_reason, created_at
       FROM core.app_user
       WHERE identity_no = $2 AND (username = $1 OR identity_no = $1)`,
      [username, identityNo]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      status: row.approval_status,
      submittedAt: new Date(String(row.approval_requested_at ?? row.created_at)).toISOString(),
      reviewedAt: row.approved_at ? new Date(String(row.approved_at)).toISOString() : undefined,
      rejectionReason: row.rejection_reason ?? undefined
    };
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    if (request.newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }
    const result = await this.pool.query<{ id: string }>(
      `UPDATE core.app_user
       SET password_hash = $3
       WHERE active = true
         AND approval_status = 'approved'
         AND identity_no = $2
         AND (username = $1 OR identity_no = $1)
         AND phone = $4
         AND identity_provider = 'local'
       RETURNING id`,
      [request.username, request.identityNo, hashPassword(request.newPassword), request.phone]
    );
    if (!result.rows[0]) {
      throw new Error("user not found or contact information does not match");
    }
    await this.pool.query(`DELETE FROM core.session WHERE user_id = $1`, [result.rows[0].id]);
  }
```

- [ ] **Step 2: HybridAuthAdapter 透传**

在 `HybridAuthAdapter` 的 `reviewRegistration` 方法之后、`listUsers` 之前插入：

```ts
  async queryRegistrationStatus(username: string, identityNo: string) {
    return this.local.queryRegistrationStatus(username, identityNo);
  }

  async resetPassword(request: PasswordResetRequest) {
    return this.local.resetPassword(request);
  }
```

- [ ] **Step 3: 类型检查**

Run: `corepack pnpm --filter @lab/core typecheck`
Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add packages/core/src/auth.ts
git commit -m "feat: add registration status and password reset to postgres and hybrid adapters"
```

---

### Task 5: API 路由

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: 添加状态查询与密码重置路由**

在 `/auth/registration` 路由的结束 `});` 之后、`app.get("/auth/me", ...)` 之前插入：

```ts
  app.post("/auth/registration/status", async (request, reply) => {
    const body = request.body as Partial<{ username: string; identityNo: string }>;
    if (!body.username || !body.identityNo) {
      return reply.code(400).send({ error: "username and identityNo are required" });
    }
    if (!kernel.auth.queryRegistrationStatus) {
      return reply
        .code(409)
        .send({ error: "registration status query is unavailable in the current authentication mode" });
    }
    const status = await kernel.auth.queryRegistrationStatus(body.username, body.identityNo);
    if (!status) {
      return reply.code(404).send({ error: "registration not found" });
    }
    return status;
  });

  app.post("/auth/password/reset", async (request, reply) => {
    const body = request.body as Partial<{
      username: string;
      identityNo: string;
      phone: string;
      newPassword: string;
    }>;
    if (!body.username || !body.identityNo || !body.phone || !body.newPassword) {
      return reply.code(400).send({
        error: "username, identityNo, phone and newPassword are required"
      });
    }
    if (!kernel.auth.resetPassword) {
      return reply
        .code(409)
        .send({ error: "password reset is unavailable in the current authentication mode" });
    }
    try {
      await kernel.auth.resetPassword({
        username: body.username,
        identityNo: body.identityNo,
        phone: body.phone,
        newPassword: body.newPassword
      });
      return { ok: true };
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("not found") ? 404 : 400)
        .send({ error: error instanceof Error ? error.message : "password reset failed" });
    }
  });
```

- [ ] **Step 2: 运行集成测试（绿灯）**

Run: `corepack pnpm --filter @lab/api test`
Expected: 全部用例 PASS（包括 Task 2 新增的注册审批、驳回、状态查询、密码重置用例）。

- [ ] **Step 3: 提交**

```bash
git add apps/api/src/main.ts
git commit -m "feat: expose public registration status and password reset endpoints"
```

---

### Task 6: 前端共享注册面板

**Files:**
- Create: `apps/web/src/components/auth/PublicRegistrationPanel.tsx`

- [ ] **Step 1: 创建组件**

新建目录 `apps/web/src/components/auth/`，创建文件 `PublicRegistrationPanel.tsx`，内容：

```tsx
import { useState, type FormEvent } from "react";
import { apiBase } from "../../utils/helpers";

interface PublicRegistrationPanelProps {
  onBack: () => void;
}

type RegistrationStatusResult = {
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

export function PublicRegistrationPanel({ onBack }: PublicRegistrationPanelProps) {
  const [view, setView] = useState<"register" | "status">("register");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [registration, setRegistration] = useState({
    username: "",
    password: "",
    identityNo: "",
    displayName: "",
    phone: ""
  });
  const [statusQuery, setStatusQuery] = useState({ username: "", identityNo: "" });
  const [statusResult, setStatusResult] = useState<RegistrationStatusResult | null>(null);

  async function submitRegistration(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registration,
          identityType: "student_no",
          reason: "个人申请加入实验室"
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "注册申请提交失败");
      setMessage(payload.message ?? "注册申请已提交，请等待管理员审核");
      setStatusQuery({ username: registration.username, identityNo: registration.identityNo });
      setRegistration({ username: "", password: "", identityNo: "", displayName: "", phone: "" });
      setView("status");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册申请提交失败");
    } finally {
      setLoading(false);
    }
  }

  async function submitStatusQuery(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/registration/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusQuery)
      });
      const payload = (await response.json()) as RegistrationStatusResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "查询失败");
      setStatusResult(payload);
      setMessage("");
    } catch (error) {
      setStatusResult(null);
      setMessage(error instanceof Error ? error.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }

  const statusText = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已驳回"
  } as const;

  return (
    <main className="login-shell">
      <form
        className="login-panel"
        onSubmit={view === "register" ? submitRegistration : submitStatusQuery}
        autoComplete="off"
      >
        <div className="brand login-brand">
          <span className="brand-glyph">◈</span>
          <div>
            <strong>实验室管理平台</strong>
            <span>Lab Ops Console</span>
          </div>
        </div>

        {view === "register" ? (
          <>
            <h1>申请加入</h1>
            <p>提交后由实验室管理员审核，审核通过后才能登录。</p>
            <label>
              登录名
              <input
                required
                value={registration.username}
                onChange={(e) => setRegistration({ ...registration, username: e.target.value })}
              />
            </label>
            <label>
              姓名
              <input
                required
                value={registration.displayName}
                onChange={(e) => setRegistration({ ...registration, displayName: e.target.value })}
              />
            </label>
            <label>
              学号
              <input
                required
                value={registration.identityNo}
                onChange={(e) => setRegistration({ ...registration, identityNo: e.target.value })}
              />
            </label>
            <label>
              手机号（可选）
              <input
                value={registration.phone}
                onChange={(e) => setRegistration({ ...registration, phone: e.target.value })}
              />
            </label>
            <label>
              密码
              <input
                required
                type="password"
                minLength={8}
                value={registration.password}
                onChange={(e) => setRegistration({ ...registration, password: e.target.value })}
              />
            </label>
            <button className="primary" disabled={loading}>
              {loading ? "提交中..." : "提交注册申请"}
            </button>
            <button
              type="button"
              className="forgot-link"
              onClick={() => setView("status")}
            >
              已提交？查询申请状态
            </button>
          </>
        ) : (
          <>
            <h1>查询申请状态</h1>
            <p>输入申请时填写的账号和学号。</p>
            <label>
              账号 / 学号
              <input
                required
                value={statusQuery.username}
                onChange={(e) => setStatusQuery({ ...statusQuery, username: e.target.value })}
              />
            </label>
            <label>
              学号
              <input
                required
                value={statusQuery.identityNo}
                onChange={(e) => setStatusQuery({ ...statusQuery, identityNo: e.target.value })}
              />
            </label>
            <button className="primary" disabled={loading}>
              {loading ? "查询中..." : "查询状态"}
            </button>
            <button type="button" className="forgot-link" onClick={() => setView("register")}>
              返回注册
            </button>
            {statusResult ? (
              <div className="reset-result">
                <p>审核状态：{statusText[statusResult.status]}</p>
                {statusResult.rejectionReason ? (
                  <p>驳回原因：{statusResult.rejectionReason}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        {message ? <span className="login-message">{message}</span> : null}
        <button type="button" className="ghost" onClick={onBack}>
          <span aria-hidden="true">←</span>
          返回登录
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `corepack pnpm --filter @lab/web typecheck`
Expected: PASS。

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/auth/PublicRegistrationPanel.tsx
git commit -m "feat: extract shared public registration panel"
```

---

### Task 7: LoginForm 接入注册与真实找回密码

**Files:**
- Modify: `apps/web/src/components/LoginForm.tsx`

- [ ] **Step 1: 引入共享面板并添加注册视图状态**

在文件顶部 import 之后添加：

```tsx
import { PublicRegistrationPanel } from "./auth/PublicRegistrationPanel";
```

在组件函数内 `const [showPassword, setShowPassword] = useState(false);` 之后添加：

```tsx
  const [showRegister, setShowRegister] = useState(false);
```

在 `if (resetMode) { ... }` 之前插入：

```tsx
  if (showRegister) {
    return <PublicRegistrationPanel onBack={() => setShowRegister(false)} />;
  }
```

- [ ] **Step 2: 更新 props 接口**

把 `LoginFormProps` 中 `resetPhone`/`setResetPhone` 之后、`resetResult` 之前插入：

```ts
  resetIdentityNo: string;
  setResetIdentityNo: (v: string) => void;
  resetNewPassword: string;
  setResetNewPassword: (v: string) => void;
```

并在函数解构参数中同步添加这 4 个字段。

- [ ] **Step 3: 替换找回密码表单**

把 `if (resetMode) { return ... }` 块中从 `<p>输入账号或学号/工号，以及绑定的手机号。</p>` 到绑定手机号 `</label>` 之间的内容替换为：

```tsx
          <p>输入账号/学号、学号/工号、绑定的手机号，并设置新密码。</p>

          <label>
            账号 / 学号
            <input
              value={resetIdentifier}
              autoComplete="off"
              placeholder="请输入账号或学号"
              onChange={(event) => setResetIdentifier(event.target.value)}
            />
          </label>
          <label>
            学号 / 工号
            <input
              value={resetIdentityNo}
              autoComplete="off"
              placeholder="请输入学号或工号"
              onChange={(event) => setResetIdentityNo(event.target.value)}
            />
          </label>
          <label>
            绑定手机号
            <input
              value={resetPhone}
              autoComplete="off"
              placeholder="请输入绑定的手机号"
              onChange={(event) => setResetPhone(event.target.value)}
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              minLength={8}
              value={resetNewPassword}
              autoComplete="new-password"
              placeholder="至少 8 位"
              onChange={(event) => setResetNewPassword(event.target.value)}
            />
          </label>
```

按钮文案从 `{loading ? "验证中..." : "找回密码"}` 改为 `{loading ? "提交中..." : "重置密码"}`。

- [ ] **Step 4: 登录面板添加注册入口**

在登录表单的 `忘记密码？` 按钮之后添加：

```tsx
        <button type="button" className="forgot-link" onClick={() => setShowRegister(true)}>
          个人注册 / 申请加入
        </button>
```

- [ ] **Step 5: 类型检查**

Run: `corepack pnpm --filter @lab/web typecheck`
Expected: 会报 `resetIdentityNo` 等 props 缺失的错误（因为 App.tsx 还未传入），这是预期的红灯；继续 Task 8 后转绿。

---

### Task 8: App.tsx 接入密码重置 API

**Files:**
- Modify: `apps/web/src/components/App.tsx`

- [ ] **Step 1: 添加状态**

在 `const [resetPhone, setResetPhone] = useState("");` 之后添加：

```tsx
  const [resetIdentityNo, setResetIdentityNo] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
```

- [ ] **Step 2: 替换 resetPassword 函数**

把整个 `resetPassword` 函数替换为：

```tsx
  async function resetPassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetNewPassword.length < 8) {
      setResetResult("新密码至少需要 8 位");
      return;
    }
    setAuthLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: resetIdentifier,
          identityNo: resetIdentityNo,
          phone: resetPhone,
          newPassword: resetNewPassword
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "密码重置失败");
      setResetResult("密码已重置，请使用新密码登录。");
      setResetNewPassword("");
    } catch (error) {
      setResetResult(error instanceof Error ? error.message : "密码重置失败");
    } finally {
      setAuthLoading(false);
    }
  }
```

- [ ] **Step 3: 传递新 props 给 LoginForm**

在 `<LoginForm` 的 `resetPhone={resetPhone}` 之后、`setResetPhone={setResetPhone}` 之后添加：

```tsx
        resetIdentityNo={resetIdentityNo}
        setResetIdentityNo={setResetIdentityNo}
        resetNewPassword={resetNewPassword}
        setResetNewPassword={setResetNewPassword}
```

- [ ] **Step 4: 类型检查**

Run: `corepack pnpm --filter @lab/web typecheck`
Expected: PASS（Task 7 的红灯转绿）。

- [ ] **Step 5: 提交（连同 Task 7 的 LoginForm 改动）**

```bash
git add apps/web/src/components/LoginForm.tsx apps/web/src/components/App.tsx
git commit -m "feat: add registration entry and self-service password reset to login form"
```

---

### Task 9: OidcLogin 复用共享面板

**Files:**
- Modify: `apps/web/src/components/OidcLogin.tsx`

- [ ] **Step 1: 移除内嵌注册表单**

- 删除 `registration` state、`submitRegistration` 函数、`registering` 视图分支（`if (registering) { return ... }` 整块）。
- 把 `if (registering) return ...` 替换为：

```tsx
  if (registering) {
    return <PublicRegistrationPanel onBack={() => setRegistering(false)} />;
  }
```

- 在文件顶部添加 import：

```tsx
import { PublicRegistrationPanel } from "./auth/PublicRegistrationPanel";
```

- 删除 `useState` 中不再使用的 `registration` state 定义，保留 `registering`、`message`、`credentials`。
- `import { apiBase } from "../utils/helpers";` 保留（XMU CAS 链接仍使用 `apiBase`）。

- [ ] **Step 2: 类型检查**

Run: `corepack pnpm --filter @lab/web typecheck`
Expected: PASS。

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/OidcLogin.tsx
git commit -m "refactor: reuse public registration panel in oidc login"
```

---

### Task 10: AccountsPage 驳回原因输入

**Files:**
- Modify: `apps/web/src/components/pages/AccountsPage.tsx`

- [ ] **Step 1: 驳回按钮改为输入原因**

把驳回按钮的 `onClick` 从硬编码改为 `window.prompt`：

```tsx
                      <button
                        type="button"
                        className="tertiary-button ghost-tone"
                        onClick={() => {
                          const remark = window.prompt("请输入驳回原因（可留空）", "");
                          if (remark !== null) {
                            void onReviewRegistration(user.id, "reject", remark);
                          }
                        }}
                      >
                        驳回
                      </button>
```

- [ ] **Step 2: 类型检查**

Run: `corepack pnpm --filter @lab/web typecheck`
Expected: PASS。

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/pages/AccountsPage.tsx
git commit -m "feat: allow admins to input rejection reason when reviewing registrations"
```

---

### Task 11: 更新接口文档

**Files:**
- Modify: `docs/项目文档/08-接口与数据契约.md`

- [ ] **Step 1: 增加认证接口小节**

在 `## 1. 统一规则` 之后插入：

```markdown
## 1.1 认证与注册审批接口

```text
POST  /auth/login                        # 登录（仅 approved 且 active 账号）
POST  /auth/registration                 # 公开：个人注册申请（学生，进入待审核）
POST  /auth/registration/status          # 公开：查询申请状态（账号 + 学号）
GET   /auth/registrations/pending        # 管理员：待审核列表（user:write）
PATCH /auth/registrations/:id            # 管理员：批准/驳回（action + remark）
POST  /auth/password/reset               # 公开：自助重置密码（账号/学号 + 学号 + 手机号）
```

个人注册仅允许 `student` 角色；注册申请必须经管理员批准后才能登录；驳回可填写原因，申请人可通过状态查询接口查看。
```

- [ ] **Step 2: 提交**

```bash
git add docs/项目文档/08-接口与数据契约.md
git commit -m "docs: document registration approval and password reset endpoints"
```

---

### Task 12: 全量验证与收尾

**Files:**
- 无新增文件

- [ ] **Step 1: 运行完整 CI 验证**

Run: `corepack pnpm typecheck`
Expected: PASS。

Run: `corepack pnpm test`
Expected: 全部 PASS。

Run: `corepack pnpm build`
Expected: PASS（含 web 构建）。

- [ ] **Step 2: 检查未提交文件**

Run: `git status --short`
Expected: 工作区干净（如有临时文件确认不误提交）。

- [ ] **Step 3: 展示最终提交历史**

Run: `git log --oneline -10`
Expected: 能看到本特性的若干 `feat:` / `refactor:` / `docs:` 提交。

---

## 自审记录

- **Spec 覆盖**：local 注册入口（Task 6/7）、状态查询（Task 1/3/4/5 + 面板）、密码重置（Task 1/3/4/5 + App/LoginForm）、驳回原因（Task 10）、Demo 适配器（Task 3）、测试（Task 2）、文档（Task 11）全部有对应任务。
- **占位符扫描**：所有步骤均含完整代码或精确命令，无 TBD/TODO。
- **类型一致性**：`queryRegistrationStatus` / `resetPassword` 在两个适配器与契约中的签名一致；前端 `resetIdentityNo` / `resetNewPassword` 在 LoginForm props 与 App state 中一致；接口路径 `/auth/registration/status` 与 `/auth/password/reset` 前后端一致。
