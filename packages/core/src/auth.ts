import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import pg from "pg";
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
import { KeycloakAuthAdapter } from "./keycloak-auth.js";

const rolePermissions: Record<Role, Permission[]> = {
  lab_admin: [
    "user:read",
    "user:write",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "inventory:stock",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "project:progress",
    "meeting:read",
    "meeting:write",
    "ai:use",
    "ai:manage"
  ],
  professor: [
    "user:read",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "meeting:read",
    "meeting:write",
    "ai:use"
  ],
  student: [
    "inventory:read",
    "inventory:apply",
    "file:read",
    "project:read",
    "meeting:read",
    "ai:use"
  ],
  member: [
    "inventory:read",
    "inventory:apply",
    "file:read",
    "project:read",
    "meeting:read",
    "ai:use"
  ],
  admin: [
    "user:read",
    "user:write",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "inventory:stock",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "project:progress",
    "meeting:read",
    "meeting:write",
    "ai:use",
    "ai:manage"
  ],
  super_admin: [
    "user:read",
    "user:write",
    "inventory:read",
    "inventory:apply",
    "inventory:approve",
    "inventory:stock",
    "file:read",
    "file:write",
    "project:read",
    "project:write",
    "project:progress",
    "meeting:read",
    "meeting:write",
    "ai:use",
    "ai:manage"
  ]
};

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

const DEMO_PASSWORDS = {
  admin: process.env.LAB_DEMO_ADMIN_PASSWORD ?? "Admin@123456",
  professor: process.env.LAB_DEMO_PROFESSOR_PASSWORD ?? "Professor@123456",
  student: process.env.LAB_DEMO_STUDENT_PASSWORD ?? "Student@123456"
};

const demoUsers: DemoUser[] = [
  {
    id: "u-admin",
    username: "admin",
    identityType: "employee_no",
    identityNo: "EMP-ADMIN-001",
    displayName: "实验室管理员",
    role: "lab_admin" as const,
    passwordHash: "",
    approvalStatus: "approved",
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "u-prof001",
    username: "professor",
    identityType: "employee_no",
    identityNo: "EMP-PROF-001",
    displayName: "张教授",
    role: "professor" as const,
    passwordHash: "",
    approvalStatus: "approved",
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "u-student001",
    username: "student001",
    identityType: "student_no",
    identityNo: "STU-001",
    displayName: "学生一号",
    role: "student" as const,
    passwordHash: "",
    approvalStatus: "approved",
    createdAt: "2026-07-01T00:00:00.000Z"
  }
];

demoUsers[0].passwordHash = hashPassword(DEMO_PASSWORDS.admin);
demoUsers[1].passwordHash = hashPassword(DEMO_PASSWORDS.professor);
demoUsers[2].passwordHash = hashPassword(DEMO_PASSWORDS.student);

const identityNoPattern = /^[A-Za-z0-9_-]{4,32}$/;
const phonePattern = /^1[3-9]\d{9}$/;

function shouldSeedDemoAccounts(): boolean {
  return process.env.LAB_SEED_DEMO_ACCOUNTS !== "false" && process.env.NODE_ENV !== "production";
}

function toActor(user: {
  id: string;
  username?: string;
  displayName?: string;
  display_name?: string;
  role: Role;
}): Actor {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? user.display_name,
    role: user.role,
    permissions: rolePermissions[user.role]
  };
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, n, r, p, saltEncoded, hashEncoded] = encoded.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !saltEncoded || !hashEncoded) {
    return false;
  }
  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(hashEncoded, "base64url");
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p)
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function validateLocalRegistration(request: LocalUserRegistrationRequest): void {
  if (!request.username.trim()) {
    throw new Error("username is required");
  }
  if (request.password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
  if (!identityNoPattern.test(request.identityNo)) {
    throw new Error("identityNo must be 4-32 letters, numbers, underscores or hyphens");
  }
  if (!request.displayName.trim()) {
    throw new Error("displayName is required");
  }
  if (!["student", "professor", "lab_admin"].includes(request.role)) {
    throw new Error("role must be student, professor or lab_admin");
  }
  if (request.role === "student" && request.identityType !== "student_no") {
    throw new Error("student role must use student_no");
  }
  if (["professor", "lab_admin"].includes(request.role) && request.identityType !== "employee_no") {
    throw new Error("professor/lab_admin role must use employee_no");
  }
}

function validatePublicRegistration(request: PublicRegistrationRequest): void {
  validateLocalRegistration({ ...request, role: "student" });
  if (request.phone) validatePhone(request.phone);
  if (request.reason && request.reason.length > 500) {
    throw new Error("reason must be at most 500 characters");
  }
}

function validatePhone(phone: string): void {
  if (!phonePattern.test(phone)) {
    throw new Error("phone must be a valid mainland China mobile number");
  }
}

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

export class DemoAuthAdapter implements AuthPort {
  private readonly users = [...demoUsers];
  private readonly sessions = new Map<string, Actor>();

  async login(username: string, password: string): Promise<{ token: string; actor: Actor } | null> {
    const user = this.users.find(
      (item) =>
        item.approvalStatus === "approved" &&
        verifyPassword(password, item.passwordHash) &&
        [item.username, item.identityNo, item.phone].some((value) => value === username)
    );
    if (!user) {
      return null;
    }

    const token = `demo-session-${randomUUID()}`;
    const actor = toActor(user);
    this.sessions.set(token, actor);
    return { token, actor };
  }

  async registerLocalUser(request: LocalUserRegistrationRequest): Promise<Actor> {
    validateLocalRegistration(request);
    if (this.users.some((user) => user.username === request.username)) {
      throw new Error("username already exists");
    }
    if (this.users.some((user) => user.identityNo === request.identityNo)) {
      throw new Error("identityNo already exists");
    }

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
    this.users.push(user);
    return toActor(user);
  }

  async submitRegistration(
    request: PublicRegistrationRequest
  ): Promise<{ id: string; status: ApprovalStatus }> {
    validatePublicRegistration(request);
    if (
      this.users.some(
        (user) => user.username === request.username || user.identityNo === request.identityNo
      )
    ) {
      throw new Error("username or identityNo already exists");
    }
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
    this.users.push(user);
    return { id: user.id, status: "pending" };
  }

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

  async listUsers(search = "", includeInactive = false): Promise<ManagedUser[]> {
    const keyword = search.trim().toLowerCase();
    void includeInactive;
    return this.users
      .filter((user) =>
        [user.username, user.displayName, user.identityNo, user.phone ?? ""].some((value) =>
          value.toLowerCase().includes(keyword)
        )
      )
      .map((user) => ({
        ...toManagedUser(user)
      }));
  }

  async getUserProfile(actorId: string): Promise<ManagedUser | null> {
    const user = this.users.find((item) => item.id === actorId);
    return user ? toManagedUser(user) : null;
  }

  async changePassword(
    actorId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }
    const user = this.users.find((item) => item.id === actorId);
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error("current password is incorrect");
    }
    user.passwordHash = hashPassword(newPassword);
  }

  async updateContact(actorId: string, phone: string): Promise<ManagedUser> {
    validatePhone(phone);
    const user = this.users.find((item) => item.id === actorId);
    if (!user) {
      throw new Error("user not found");
    }
    if (this.users.some((item) => item.id !== actorId && item.phone === phone)) {
      throw new Error("phone already exists");
    }
    user.phone = phone;
    return toManagedUser(user);
  }

  async resetUserPassword(targetUserId: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }
    const user = this.users.find((item) => item.id === targetUserId);
    if (!user) {
      throw new Error("user not found");
    }
    if (user.role === "super_admin") {
      throw new Error("super admin password cannot be reset here");
    }
    user.passwordHash = hashPassword(newPassword);
  }

  async deactivateUser(targetUserId: string): Promise<void> {
    const userIndex = this.users.findIndex((item) => item.id === targetUserId);
    const user = this.users[userIndex];
    if (!user) {
      throw new Error("user not found");
    }
    if (user.role === "super_admin") {
      throw new Error("super admin cannot be deleted here");
    }
    this.users.splice(userIndex, 1);
  }

  async updateUserRole(targetUserId: string, role: Role): Promise<ManagedUser> {
    if (!["student", "professor", "lab_admin"].includes(role)) {
      throw new Error("role must be student, professor or lab_admin");
    }
    const user = this.users.find((item) => item.id === targetUserId);
    if (!user) {
      throw new Error("user not found");
    }
    if (user.role === "super_admin") {
      throw new Error("super admin role cannot be changed");
    }
    user.role = role;
    return toManagedUser(user);
  }

  async authenticate(token: string): Promise<Actor | null> {
    const rawToken = token.replace("Bearer ", "");
    const session = this.sessions.get(rawToken);
    if (session) {
      return session;
    }

    const role = rawToken as Role;
    if (!["lab_admin", "professor", "student"].includes(role)) {
      return null;
    }

    return {
      id: `demo-${role}`,
      username: role,
      displayName: `演示${role}`,
      role,
      permissions: rolePermissions[role]
    };
  }

  assertPermission(actor: Actor, permission: Permission): void {
    if (!actor.permissions.includes(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

export class PostgresAuthAdapter implements AuthPort {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS core;

      CREATE TABLE IF NOT EXISTS core.app_user (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE,
        student_id TEXT UNIQUE,
        identity_type TEXT NOT NULL DEFAULT 'student_no',
        identity_no TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student', 'professor', 'lab_admin')),
        identity_provider TEXT NOT NULL DEFAULT 'local',
        external_subject TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        approval_status TEXT NOT NULL DEFAULT 'approved'
          CHECK (approval_status IN ('pending', 'approved', 'rejected')),
        approval_requested_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        approved_by TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS identity_type TEXT NOT NULL DEFAULT 'student_no';
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS identity_no TEXT UNIQUE;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS identity_provider TEXT NOT NULL DEFAULT 'local';
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS external_subject TEXT;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS approved_by TEXT;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      UPDATE core.app_user
      SET identity_type = CASE
            WHEN role = 'student' THEN 'student_no'
            ELSE 'employee_no'
          END
      WHERE identity_type IS NULL OR identity_type NOT IN ('student_no', 'employee_no');

      UPDATE core.app_user
      SET identity_no = COALESCE(
            identity_no,
            student_id,
            CASE
              WHEN role = 'student' THEN CONCAT('STU-', id)
              ELSE CONCAT('EMP-', id)
            END
          )
      WHERE identity_no IS NULL OR identity_no = '';

      -- Migration: update role system (drop old constraint first!)
      ALTER TABLE core.app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
      UPDATE core.app_user SET role = 'lab_admin' WHERE role IN ('super_admin', 'admin');
      UPDATE core.app_user SET role = 'student' WHERE role = 'member';
      ALTER TABLE core.app_user ADD CONSTRAINT app_user_role_check
        CHECK (role IN ('student', 'professor', 'lab_admin'));
      ALTER TABLE core.app_user DROP CONSTRAINT IF EXISTS app_user_approval_status_check;
      ALTER TABLE core.app_user ADD CONSTRAINT app_user_approval_status_check
        CHECK (approval_status IN ('pending', 'approved', 'rejected'));

      CREATE TABLE IF NOT EXISTS core.session (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES core.app_user(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    if (!shouldSeedDemoAccounts()) {
      return;
    }

    for (const user of demoUsers) {
      await this.pool.query(
        `INSERT INTO core.app_user (
           id,
           username,
           student_id,
           identity_type,
           identity_no,
           password_hash,
           display_name,
           role
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (username) DO UPDATE SET
           role = EXCLUDED.role,
           display_name = EXCLUDED.display_name,
           student_id = EXCLUDED.student_id,
           identity_type = EXCLUDED.identity_type,
           identity_no = EXCLUDED.identity_no,
           password_hash = EXCLUDED.password_hash`,
        [
          user.id,
          user.username,
          user.identityType === "student_no" ? user.identityNo : null,
          user.identityType,
          user.identityNo,
          user.passwordHash,
          user.displayName,
          user.role
        ]
      );
    }
  }

  async login(username: string, password: string): Promise<{ token: string; actor: Actor } | null> {
    const userResult = await this.pool.query<{
      id: string;
      username: string;
      display_name: string;
      role: Role;
      password_hash: string;
    }>(
      `SELECT id, username, display_name, role, password_hash
       FROM core.app_user
      WHERE active = true
         AND approval_status = 'approved'
         AND (username = $1 OR identity_no = $1 OR student_id = $1 OR phone = $1)`,
      [username]
    );
    const user = userResult.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return null;
    }

    const token = randomUUID();
    await this.pool.query(
      `INSERT INTO core.session (token, user_id, expires_at)
       VALUES ($1, $2, now() + interval '8 hours')`,
      [token, user.id]
    );

    return { token, actor: toActor(user) };
  }

  async loginExternal(
    provider: string,
    subject: string,
    displayName?: string
  ): Promise<{ token: string; actor: Actor } | null> {
    const result = await this.pool.query<{
      id: string;
      username: string;
      display_name: string;
      role: Role;
    }>(
      `SELECT id, username, display_name, role
         FROM core.app_user
        WHERE active = true
          AND approval_status = 'approved'
          AND (external_subject = $1 OR (identity_provider = $2 AND identity_no = $1))
        LIMIT 1`,
      [subject, provider]
    );
    const user = result.rows[0];
    if (!user) return null;

    await this.pool.query(
      `UPDATE core.app_user
          SET external_subject = COALESCE(external_subject, $1),
              identity_provider = $2,
              display_name = COALESCE(NULLIF($3, ''), display_name)
        WHERE id = $4`,
      [subject, provider, displayName ?? "", user.id]
    );
    const token = randomUUID();
    await this.pool.query(
      `INSERT INTO core.session (token, user_id, expires_at)
       VALUES ($1, $2, now() + interval '8 hours')`,
      [token, user.id]
    );
    return { token, actor: toActor({ ...user, display_name: displayName || user.display_name }) };
  }

  async registerLocalUser(request: LocalUserRegistrationRequest): Promise<Actor> {
    validateLocalRegistration(request);

    try {
      const result = await this.pool.query<{
        id: string;
        username: string;
        display_name: string;
        role: Role;
      }>(
        `INSERT INTO core.app_user
          (
            id,
            username,
            student_id,
            identity_type,
            identity_no,
            password_hash,
            display_name,
            role,
            identity_provider
          )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'local')
         RETURNING id, username, display_name, role`,
        [
          `u-${randomUUID()}`,
          request.username,
          request.identityType === "student_no" ? request.identityNo : null,
          request.identityType,
          request.identityNo,
          hashPassword(request.password),
          request.displayName,
          request.role
        ]
      );

      return toActor(result.rows[0]);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        throw new Error("username or identityNo already exists");
      }
      throw error;
    }
  }

  async submitRegistration(
    request: PublicRegistrationRequest
  ): Promise<{ id: string; status: ApprovalStatus }> {
    validatePublicRegistration(request);
    try {
      const result = await this.pool.query<{ id: string; approval_status: ApprovalStatus }>(
        `INSERT INTO core.app_user
          (id, username, identity_type, identity_no, phone, password_hash, display_name, role,
           identity_provider, active, approval_status, approval_requested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'student', 'local', false, 'pending', now())
         RETURNING id, approval_status`,
        [
          `u-${randomUUID()}`,
          request.username.trim(),
          request.identityType,
          request.identityNo.trim(),
          request.phone ?? null,
          hashPassword(request.password),
          request.displayName.trim()
        ]
      );
      return { id: result.rows[0].id, status: result.rows[0].approval_status };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        throw new Error("username, identityNo or phone already exists");
      }
      throw error;
    }
  }

  async listUsers(search = "", includeInactive = false): Promise<ManagedUser[]> {
    const keyword = `%${search.trim()}%`;
    const result = await this.pool.query<{
      id: string;
      username: string;
      identity_type: IdentityType;
      identity_no: string | null;
      phone: string | null;
      display_name: string;
      role: Role;
      identity_provider: string;
      active: boolean;
      approval_status: ApprovalStatus;
      created_at: string;
    }>(
      `SELECT id, username, identity_type, identity_no, phone, display_name, role, identity_provider, active, approval_status, created_at
       FROM core.app_user
       WHERE ($2 = true OR active = true)
         AND (
          $1 = '%%'
          OR username ILIKE $1
          OR display_name ILIKE $1
          OR identity_no ILIKE $1
          OR student_id ILIKE $1
          OR phone ILIKE $1
         )
       ORDER BY created_at DESC, username ASC
       LIMIT 200`,
      [keyword, includeInactive]
    );

    return result.rows.map((user) => ({
      id: user.id,
      username: user.username,
      identityType: user.identity_type,
      identityNo: user.identity_no ?? "",
      phone: user.phone ?? undefined,
      displayName: user.display_name,
      role: user.role,
      identityProvider: user.identity_provider,
      active: user.active,
      approvalStatus: user.approval_status,
      createdAt: new Date(String(user.created_at)).toISOString()
    }));
  }

  async getUserProfile(actorId: string): Promise<ManagedUser | null> {
    const result = await this.pool.query<{
      id: string;
      username: string;
      identity_type: IdentityType;
      identity_no: string | null;
      phone: string | null;
      display_name: string;
      role: Role;
      identity_provider: string;
      active: boolean;
      approval_status: ApprovalStatus;
      created_at: string;
    }>(
      `SELECT id, username, identity_type, identity_no, phone, display_name, role, identity_provider, active, approval_status, created_at
       FROM core.app_user
       WHERE id = $1`,
      [actorId]
    );

    const user = result.rows[0];
    return user
      ? {
          id: user.id,
          username: user.username,
          identityType: user.identity_type,
          identityNo: user.identity_no ?? "",
          phone: user.phone ?? undefined,
          displayName: user.display_name,
          role: user.role,
          identityProvider: user.identity_provider,
          active: user.active,
          approvalStatus: user.approval_status,
          createdAt: new Date(String(user.created_at)).toISOString()
        }
      : null;
  }

  async changePassword(
    actorId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }

    const result = await this.pool.query<{
      password_hash: string;
      identity_provider: string;
    }>(
      `SELECT password_hash, identity_provider
       FROM core.app_user
       WHERE id = $1 AND active = true`,
      [actorId]
    );
    const user = result.rows[0];
    if (!user) {
      throw new Error("user not found");
    }
    if (user.identity_provider !== "local") {
      throw new Error("password is managed by identity provider");
    }
    if (!verifyPassword(currentPassword, user.password_hash)) {
      throw new Error("current password is incorrect");
    }

    await this.pool.query(`UPDATE core.app_user SET password_hash = $1 WHERE id = $2`, [
      hashPassword(newPassword),
      actorId
    ]);
  }

  async updateContact(actorId: string, phone: string): Promise<ManagedUser> {
    validatePhone(phone);
    try {
      await this.pool.query(`UPDATE core.app_user SET phone = $1 WHERE id = $2`, [phone, actorId]);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        throw new Error("phone already exists");
      }
      throw error;
    }

    const profile = await this.getUserProfile(actorId);
    if (!profile) {
      throw new Error("user not found");
    }
    return profile;
  }

  async resetUserPassword(targetUserId: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error("newPassword must be at least 8 characters");
    }

    const result = await this.pool.query<{ role: Role; identity_provider: string }>(
      `SELECT role, identity_provider FROM core.app_user WHERE id = $1 AND active = true`,
      [targetUserId]
    );
    const user = result.rows[0];
    if (!user) {
      throw new Error("user not found");
    }
    if (user.role === "super_admin") {
      throw new Error("super admin password cannot be reset here");
    }
    if (user.identity_provider !== "local") {
      throw new Error("password is managed by identity provider");
    }

    await this.pool.query(`UPDATE core.app_user SET password_hash = $1 WHERE id = $2`, [
      hashPassword(newPassword),
      targetUserId
    ]);
  }

  async deactivateUser(targetUserId: string): Promise<void> {
    const result = await this.pool.query<{ role: Role }>(
      `UPDATE core.app_user
       SET active = false
       WHERE id = $1 AND active = true AND role != 'super_admin'
       RETURNING role`,
      [targetUserId]
    );
    if (!result.rows[0]) {
      throw new Error("active user not found");
    }

    await this.pool.query(`DELETE FROM core.session WHERE user_id = $1`, [targetUserId]);
  }

  async updateUserRole(targetUserId: string, role: Role): Promise<ManagedUser> {
    if (!["student", "professor", "lab_admin"].includes(role)) {
      throw new Error("role must be student, professor or lab_admin");
    }

    const result = await this.pool.query<{ role: Role }>(
      `SELECT role FROM core.app_user WHERE id = $1 AND active = true`,
      [targetUserId]
    );
    const user = result.rows[0];
    if (!user) {
      throw new Error("active user not found");
    }
    if (user.role === "super_admin") {
      throw new Error("super admin role cannot be changed");
    }

    await this.pool.query(`UPDATE core.app_user SET role = $1 WHERE id = $2`, [role, targetUserId]);
    await this.pool.query(`DELETE FROM core.session WHERE user_id = $1`, [targetUserId]);

    const profile = await this.getUserProfile(targetUserId);
    if (!profile) {
      throw new Error("user not found");
    }
    return profile;
  }

  async listPendingRegistrations(): Promise<ManagedUser[]> {
    const result = await this.pool.query<{
      id: string;
      username: string;
      identity_type: IdentityType;
      identity_no: string | null;
      phone: string | null;
      display_name: string;
      role: Role;
      identity_provider: string;
      active: boolean;
      approval_status: ApprovalStatus;
      created_at: string;
    }>(
      `SELECT id, username, identity_type, identity_no, phone, display_name, role, identity_provider,
              active, approval_status, created_at
       FROM core.app_user WHERE approval_status = 'pending' ORDER BY created_at ASC LIMIT 200`
    );
    return result.rows.map((user) => ({
      id: user.id,
      username: user.username,
      identityType: user.identity_type,
      identityNo: user.identity_no ?? "",
      phone: user.phone ?? undefined,
      displayName: user.display_name,
      role: user.role,
      identityProvider: user.identity_provider,
      active: user.active,
      approvalStatus: user.approval_status,
      createdAt: new Date(String(user.created_at)).toISOString()
    }));
  }

  async reviewRegistration(
    targetUserId: string,
    action: "approve" | "reject",
    reviewerId: string,
    remark = ""
  ): Promise<ManagedUser> {
    const result = await this.pool.query(
      `UPDATE core.app_user
       SET approval_status = $2,
           active = ($2 = 'approved'),
           approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE NULL END,
           approved_by = $3,
           rejection_reason = CASE WHEN $2 = 'rejected' THEN $4 ELSE NULL END
       WHERE id = $1 AND approval_status = 'pending'
       RETURNING id`,
      [targetUserId, action === "approve" ? "approved" : "rejected", reviewerId, remark]
    );
    if (!result.rows[0]) throw new Error("pending registration not found");
    return (await this.getUserProfile(targetUserId)) as ManagedUser;
  }

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

  async authenticate(token: string): Promise<Actor | null> {
    const rawToken = token.replace("Bearer ", "");
    const result = await this.pool.query<{
      id: string;
      username: string;
      display_name: string;
      role: Role;
    }>(
      `SELECT u.id, u.username, u.display_name, u.role
       FROM core.session s
       JOIN core.app_user u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > now() AND u.active = true`,
      [rawToken]
    );

    const user = result.rows[0];
    return user ? toActor(user) : null;
  }

  assertPermission(actor: Actor, permission: Permission): void {
    if (!actor.permissions.includes(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

/**
 * 混合认证：Keycloak 负责统一身份登录，本地数据库负责管理员创建账号和审核注册账号。
 * 两条身份链共用同一套业务权限，不把密码交给 Keycloak 以外的 OIDC 流程处理。
 */
class HybridAuthAdapter implements AuthPort {
  constructor(
    private readonly oidc: KeycloakAuthAdapter,
    private readonly local: PostgresAuthAdapter
  ) {}

  async initialize() {
    await this.local.initialize();
  }

  async login(username: string, password: string) {
    return this.local.login(username, password);
  }

  async loginExternal(provider: string, subject: string, displayName?: string) {
    return this.local.loginExternal(provider, subject, displayName);
  }

  async authenticate(token: string) {
    return (await this.oidc.authenticate(token)) ?? (await this.local.authenticate(token));
  }

  async registerLocalUser(request: LocalUserRegistrationRequest) {
    return this.local.registerLocalUser(request);
  }

  async submitRegistration(request: PublicRegistrationRequest) {
    return this.local.submitRegistration(request);
  }

  async listPendingRegistrations() {
    return this.local.listPendingRegistrations();
  }

  async reviewRegistration(
    targetUserId: string,
    action: "approve" | "reject",
    reviewerId: string,
    remark?: string
  ) {
    return this.local.reviewRegistration(targetUserId, action, reviewerId, remark);
  }

  async queryRegistrationStatus(username: string, identityNo: string) {
    return this.local.queryRegistrationStatus(username, identityNo);
  }

  async resetPassword(request: PasswordResetRequest) {
    return this.local.resetPassword(request);
  }

  async listUsers(search?: string, includeInactive?: boolean) {
    return this.local.listUsers(search, includeInactive);
  }

  async getUserProfile(actorId: string) {
    return this.local.getUserProfile(actorId);
  }

  async changePassword(actorId: string, currentPassword: string, newPassword: string) {
    return this.local.changePassword(actorId, currentPassword, newPassword);
  }

  async updateContact(actorId: string, phone: string) {
    return this.local.updateContact(actorId, phone);
  }

  async resetUserPassword(targetUserId: string, newPassword: string) {
    return this.local.resetUserPassword(targetUserId, newPassword);
  }

  async deactivateUser(targetUserId: string) {
    return this.local.deactivateUser(targetUserId);
  }

  async updateUserRole(targetUserId: string, role: Role) {
    return this.local.updateUserRole(targetUserId, role);
  }

  assertPermission(actor: Actor, permission: Permission) {
    this.oidc.assertPermission(actor, permission);
  }
}

export function createAuthAdapter(databaseUrl?: string): AuthPort {
  if (process.env.AUTH_MODE === "oidc" || process.env.AUTH_MODE === "hybrid") {
    const issuer = process.env.KEYCLOAK_ISSUER;
    const clientId = process.env.KEYCLOAK_CLIENT_ID;
    if (!issuer || !clientId) {
      throw new Error("AUTH_MODE=oidc requires KEYCLOAK_ISSUER and KEYCLOAK_CLIENT_ID");
    }
    const oidc = new KeycloakAuthAdapter(issuer, clientId, process.env.KEYCLOAK_AUDIENCE);
    if (process.env.AUTH_MODE === "hybrid") {
      if (!databaseUrl) throw new Error("AUTH_MODE=hybrid requires DATABASE_URL");
      return new HybridAuthAdapter(oidc, new PostgresAuthAdapter(databaseUrl));
    }
    return oidc;
  }
  if (process.env.NODE_ENV === "production" && process.env.AUTH_MODE !== "local") {
    throw new Error(
      "Production authentication must explicitly configure AUTH_MODE=oidc, hybrid or local"
    );
  }
  if (!databaseUrl) {
    return new DemoAuthAdapter();
  }
  return new PostgresAuthAdapter(databaseUrl);
}
