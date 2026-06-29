import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import type {
  Actor,
  AuthPort,
  LocalUserRegistrationRequest,
  ManagedUser,
  Permission,
  Role
} from "./contracts.js";

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
  ]
};

interface DemoUser {
  id: string;
  username: string;
  studentId?: string;
  phone?: string;
  displayName: string;
  role: Role;
  password: string;
}

const demoUsers: DemoUser[] = [
  {
    id: "u-admin",
    username: "admin",
    studentId: "T000001",
    displayName: "实验室管理员",
    role: "lab_admin" as const,
    password: "Admin@123456"
  },
  {
    id: "u-prof001",
    username: "professor",
    studentId: "T000002",
    displayName: "张教授",
    role: "professor" as const,
    password: "Professor@123456"
  },
  {
    id: "u-student001",
    username: "student001",
    studentId: "S000001",
    displayName: "学生一号",
    role: "student" as const,
    password: "Student@123456"
  }
];

const studentIdPattern = /^[A-Za-z0-9_-]{4,32}$/;
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
  return createHash("sha256").update(password).digest("hex");
}

function validateLocalRegistration(request: LocalUserRegistrationRequest): void {
  if (!request.username.trim()) {
    throw new Error("username is required");
  }
  if (request.password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
  if (!studentIdPattern.test(request.studentId)) {
    throw new Error("studentId must be 4-32 letters, numbers, underscores or hyphens");
  }
  if (!request.displayName.trim()) {
    throw new Error("displayName is required");
  }
  if (!["admin", "member"].includes(request.role)) {
    throw new Error("role must be admin or member");
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
    studentId: user.studentId,
    phone: user.phone,
    displayName: user.displayName,
    role: user.role,
    identityProvider: "local",
    active: true,
    createdAt: new Date().toISOString()
  };
}

export class DemoAuthAdapter implements AuthPort {
  private readonly users = [...demoUsers];
  private readonly sessions = new Map<string, Actor>();

  async login(username: string, password: string): Promise<{ token: string; actor: Actor } | null> {
    const user = this.users.find(
      (item) =>
        item.password === password &&
        [item.username, item.studentId, item.phone].some((value) => value === username)
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
    if (this.users.some((user) => user.studentId === request.studentId)) {
      throw new Error("studentId already exists");
    }

    const user = {
      id: `u-${request.username}`,
      username: request.username,
      studentId: request.studentId,
      displayName: request.displayName,
      role: request.role,
      password: request.password
    };
    this.users.push(user);
    return toActor(user);
  }

  async listUsers(search = "", includeInactive = false): Promise<ManagedUser[]> {
    const keyword = search.trim().toLowerCase();
    void includeInactive;
    return this.users
      .filter((user) =>
        [user.username, user.displayName, user.studentId ?? "", user.phone ?? ""].some((value) =>
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
    if (!user || user.password !== currentPassword) {
      throw new Error("current password is incorrect");
    }
    user.password = newPassword;
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
    if (user.role !== "member") {
      throw new Error("only member password can be reset here");
    }
    user.password = newPassword;
  }

  async deactivateUser(targetUserId: string): Promise<void> {
    const userIndex = this.users.findIndex((item) => item.id === targetUserId);
    const user = this.users[userIndex];
    if (!user) {
      throw new Error("user not found");
    }
    if (user.role !== "member") {
      throw new Error("only member can be deleted here");
    }
    this.users.splice(userIndex, 1);
  }

  async updateUserRole(targetUserId: string, role: Role): Promise<ManagedUser> {
    if (!["admin", "member"].includes(role)) {
      throw new Error("role must be admin or member");
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
    if (!["super_admin", "admin", "member"].includes(role)) {
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
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student', 'professor', 'lab_admin')),
        identity_provider TEXT NOT NULL DEFAULT 'local',
        external_subject TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE;
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS identity_provider TEXT NOT NULL DEFAULT 'local';
      ALTER TABLE core.app_user ADD COLUMN IF NOT EXISTS external_subject TEXT;

      -- Migration: update role system (drop old constraint first!)
      ALTER TABLE core.app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
      UPDATE core.app_user SET role = 'lab_admin' WHERE role IN ('super_admin', 'admin');
      UPDATE core.app_user SET role = 'student' WHERE role = 'member';
      ALTER TABLE core.app_user ADD CONSTRAINT app_user_role_check
        CHECK (role IN ('student', 'professor', 'lab_admin'));

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
        `INSERT INTO core.app_user (id, username, student_id, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE SET
           role = EXCLUDED.role,
           display_name = EXCLUDED.display_name,
           student_id = EXCLUDED.student_id,
           password_hash = EXCLUDED.password_hash`,
        [
          user.id,
          user.username,
          user.studentId,
          hashPassword(user.password),
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
         AND (username = $1 OR student_id = $1 OR phone = $1)`,
      [username]
    );
    const user = userResult.rows[0];
    if (!user || user.password_hash !== hashPassword(password)) {
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
          (id, username, student_id, password_hash, display_name, role, identity_provider)
         VALUES ($1, $2, $3, $4, $5, $6, 'local')
         RETURNING id, username, display_name, role`,
        [
          `u-${randomUUID()}`,
          request.username,
          request.studentId,
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
        throw new Error("username or studentId already exists");
      }
      throw error;
    }
  }

  async listUsers(search = "", includeInactive = false): Promise<ManagedUser[]> {
    const keyword = `%${search.trim()}%`;
    const result = await this.pool.query<{
      id: string;
      username: string;
      student_id: string | null;
      phone: string | null;
      display_name: string;
      role: Role;
      identity_provider: string;
      active: boolean;
      created_at: string;
    }>(
      `SELECT id, username, student_id, phone, display_name, role, identity_provider, active, created_at
       FROM core.app_user
       WHERE ($2 = true OR active = true)
         AND (
          $1 = '%%'
          OR username ILIKE $1
          OR display_name ILIKE $1
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
      studentId: user.student_id ?? undefined,
      phone: user.phone ?? undefined,
      displayName: user.display_name,
      role: user.role,
      identityProvider: user.identity_provider,
      active: user.active,
      createdAt: new Date(String(user.created_at)).toISOString()
    }));
  }

  async getUserProfile(actorId: string): Promise<ManagedUser | null> {
    const result = await this.pool.query<{
      id: string;
      username: string;
      student_id: string | null;
      phone: string | null;
      display_name: string;
      role: Role;
      identity_provider: string;
      active: boolean;
      created_at: string;
    }>(
      `SELECT id, username, student_id, phone, display_name, role, identity_provider, active, created_at
       FROM core.app_user
       WHERE id = $1`,
      [actorId]
    );

    const user = result.rows[0];
    return user
      ? {
          id: user.id,
          username: user.username,
          studentId: user.student_id ?? undefined,
          phone: user.phone ?? undefined,
          displayName: user.display_name,
          role: user.role,
          identityProvider: user.identity_provider,
          active: user.active,
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
    if (user.password_hash !== hashPassword(currentPassword)) {
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
    if (user.role !== "member") {
      throw new Error("only member password can be reset here");
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
       WHERE id = $1 AND active = true AND role = 'member'
       RETURNING role`,
      [targetUserId]
    );
    if (!result.rows[0]) {
      throw new Error("active member user not found");
    }

    await this.pool.query(`DELETE FROM core.session WHERE user_id = $1`, [targetUserId]);
  }

  async updateUserRole(targetUserId: string, role: Role): Promise<ManagedUser> {
    if (!["admin", "member"].includes(role)) {
      throw new Error("role must be admin or member");
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

export function createAuthAdapter(databaseUrl?: string): AuthPort {
  if (!databaseUrl) {
    return new DemoAuthAdapter();
  }
  return new PostgresAuthAdapter(databaseUrl);
}
