import type { PluginManifest } from "@lab/core";
import { createDomainEvent } from "@lab/core";
import { randomUUID } from "node:crypto";
import pg from "pg";

// ── Types ──────────────────────────────────────────────

type ProjectStatus = "pending" | "active" | "archived" | "completed";
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  startsAt?: string;
  endsAt?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId?: string;
  assigneeName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface ProjectCreateRequest {
  name: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
}

interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status?: ProjectStatus;
}

interface TaskCreateRequest {
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

interface TaskUpdateRequest {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
}

interface CommentCreateRequest {
  content: string;
}

type MemberRole = "leader" | "member" | "advisor" | "manager";

interface ProjectMember {
  projectId: string;
  userId: string;
  userName?: string;
  memberRole: MemberRole;
  joinedAt: string;
}

interface ProgressReport {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ── Repository Interface ───────────────────────────────

interface ProjectRepository {
  initialize(): Promise<void>;
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(input: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project>;
  updateProject(
    id: string,
    input: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>
  ): Promise<Project | null>;
  listTasks(projectId: string): Promise<ProjectTask[]>;
  createTask(input: Omit<ProjectTask, "id" | "createdAt" | "updatedAt">): Promise<ProjectTask>;
  updateTask(
    id: string,
    input: Partial<Omit<ProjectTask, "id" | "createdAt" | "updatedAt">>
  ): Promise<ProjectTask | null>;
  listComments(taskId: string): Promise<TaskComment[]>;
  createComment(input: Omit<TaskComment, "id" | "createdAt">): Promise<TaskComment>;
  listMemberProjectIds(userId: string): Promise<Set<string>>;
  addMember(projectId: string, userId: string, userName: string, memberRole: string): Promise<void>;
  listMembers(projectId: string): Promise<ProjectMember[]>;
  listProgress(projectId: string): Promise<ProgressReport[]>;
  createProgress(
    projectId: string,
    authorId: string,
    authorName: string,
    title: string,
    content: string
  ): Promise<ProgressReport>;
}

// ── Seed Data ──────────────────────────────────────────

const seedProjects: Project[] = [
  {
    id: "proj-001",
    name: "细胞培养条件优化",
    description: "探究不同培养基配方对Hela细胞生长速率的影响，建立最优培养方案。",
    ownerId: "u-prof001",
    ownerName: "张教授",
    startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 23).toISOString(),
    status: "active",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  }
];

const seedMembers: ProjectMember[] = [
  {
    projectId: "proj-001",
    userId: "u-prof001",
    userName: "张教授",
    memberRole: "manager",
    joinedAt: new Date().toISOString()
  },
  {
    projectId: "proj-001",
    userId: "u-student001",
    userName: "学生一号",
    memberRole: "leader",
    joinedAt: new Date().toISOString()
  }
];

const seedTasks: ProjectTask[] = [
  {
    id: "task-001",
    projectId: "proj-001",
    title: "培养基配方文献调研",
    description: "查阅近3年关于Hela细胞培养的文献，汇总5种以上优化方案。",
    assigneeId: "u-student001",
    assigneeName: "学生一号",
    priority: "high",
    status: "in_progress",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: "task-002",
    projectId: "proj-001",
    title: "配制3组测试培养基",
    description: "根据文献调研结果，配制3组不同血清浓度的测试培养基。",
    assigneeId: "u-student001",
    assigneeName: "学生一号",
    priority: "medium",
    status: "todo",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  }
];

// ── Memory Repository ──────────────────────────────────

class MemoryProjectRepository implements ProjectRepository {
  private readonly projects = structuredClone(seedProjects);
  private readonly tasks = structuredClone(seedTasks);
  private readonly comments: TaskComment[] = [];
  private readonly members = structuredClone(seedMembers);

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async listProjects(): Promise<Project[]> {
    return [...this.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) ?? null;
  }

  async createProject(input: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.projects.unshift(project);
    return project;
  }

  async updateProject(
    id: string,
    input: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>
  ): Promise<Project | null> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.projects[idx] = { ...this.projects[idx], ...input, updatedAt: new Date().toISOString() };
    return this.projects[idx];
  }

  async listTasks(projectId: string): Promise<ProjectTask[]> {
    return this.tasks
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createTask(
    input: Omit<ProjectTask, "id" | "createdAt" | "updatedAt">
  ): Promise<ProjectTask> {
    const now = new Date().toISOString();
    const task: ProjectTask = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.tasks.unshift(task);
    return task;
  }

  async updateTask(
    id: string,
    input: Partial<Omit<ProjectTask, "id" | "createdAt" | "updatedAt">>
  ): Promise<ProjectTask | null> {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const prev = this.tasks[idx];
    const updated: ProjectTask = {
      ...prev,
      ...input,
      completedAt:
        input.status === "done" && prev.status !== "done"
          ? new Date().toISOString()
          : prev.completedAt,
      updatedAt: new Date().toISOString()
    };
    this.tasks[idx] = updated;
    return updated;
  }

  async listComments(taskId: string): Promise<TaskComment[]> {
    return this.comments
      .filter((c) => c.taskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createComment(input: Omit<TaskComment, "id" | "createdAt">): Promise<TaskComment> {
    const comment: TaskComment = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.comments.unshift(comment);
    return comment;
  }

  async listMemberProjectIds(userId: string): Promise<Set<string>> {
    return new Set(this.members.filter((m) => m.userId === userId).map((m) => m.projectId));
  }

  async addMember(
    projectId: string,
    userId: string,
    userName: string,
    memberRole: string
  ): Promise<void> {
    if (!this.members.some((m) => m.projectId === projectId && m.userId === userId)) {
      this.members.push({
        projectId,
        userId,
        userName,
        memberRole,
        joinedAt: new Date().toISOString()
      });
    }
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    return this.members.filter((m) => m.projectId === projectId);
  }

  private readonly progressReports: ProgressReport[] = [];

  async listProgress(projectId: string): Promise<ProgressReport[]> {
    return this.progressReports.filter((r) => r.projectId === projectId);
  }

  async createProgress(
    projectId: string,
    authorId: string,
    authorName: string,
    title: string,
    content: string
  ): Promise<ProgressReport> {
    const report: ProgressReport = {
      id: randomUUID(),
      projectId,
      authorId,
      authorName,
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.progressReports.unshift(report);
    return report;
  }
}

// ── PostgreSQL Repository ──────────────────────────────

class PostgresProjectRepository implements ProjectRepository {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS projects;

      CREATE TABLE IF NOT EXISTS projects.project (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        owner_id TEXT NOT NULL,
        owner_name TEXT NOT NULL DEFAULT '',
        starts_at TIMESTAMPTZ,
        ends_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'archived', 'completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Migration: drop old member_ids column if exists
      ALTER TABLE projects.project DROP COLUMN IF EXISTS member_ids;

      -- Migration: update project status constraint
      ALTER TABLE projects.project DROP CONSTRAINT IF EXISTS project_status_check;
      ALTER TABLE projects.project ADD CONSTRAINT project_status_check
        CHECK (status IN ('pending', 'active', 'archived', 'completed'));

      CREATE TABLE IF NOT EXISTS projects.project_member (
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL DEFAULT '',
        member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('leader','member','advisor','manager')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS projects.progress_report (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS projects.task (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        assignee_id TEXT,
        assignee_name TEXT,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS projects.task_comment (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES projects.task(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS project_status_idx ON projects.project(status);
      CREATE INDEX IF NOT EXISTS task_project_idx ON projects.task(project_id);
      CREATE INDEX IF NOT EXISTS task_status_idx ON projects.task(status);
      CREATE INDEX IF NOT EXISTS comment_task_idx ON projects.task_comment(task_id);
    `);

    const count = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM projects.project"
    );
    if (Number(count.rows[0]?.count ?? 0) === 0) {
      for (const project of seedProjects) {
        await this.pool.query(
          `INSERT INTO projects.project (id, name, description, owner_id, owner_name, starts_at, ends_at, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            project.id,
            project.name,
            project.description,
            project.ownerId,
            project.ownerName,
            project.startsAt ?? null,
            project.endsAt ?? null,
            project.status,
            project.createdAt,
            project.updatedAt
          ]
        );
      }
      for (const task of seedTasks) {
        await this.pool.query(
          `INSERT INTO projects.task (id, project_id, title, description, assignee_id, assignee_name, priority, status, due_date, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            task.id,
            task.projectId,
            task.title,
            task.description,
            task.assigneeId ?? null,
            task.assigneeName ?? null,
            task.priority,
            task.status,
            task.dueDate ?? null,
            task.createdAt,
            task.updatedAt
          ]
        );
      }
    }
    // Always ensure seed members exist (project_member may be empty on upgrade)
    for (const member of seedMembers) {
      await this.pool.query(
        `INSERT INTO projects.project_member (project_id, user_id, user_name, member_role)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [member.projectId, member.userId, member.userName, member.memberRole]
      );
    }
  }

  async listProjects(): Promise<Project[]> {
    const r = await this.pool.query("SELECT * FROM projects.project ORDER BY updated_at DESC");
    return r.rows.map(mapProjectRow);
  }

  async getProject(id: string): Promise<Project | null> {
    const r = await this.pool.query("SELECT * FROM projects.project WHERE id = $1", [id]);
    return r.rows[0] ? mapProjectRow(r.rows[0]) : null;
  }

  async createProject(input: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const id = randomUUID();
    const r = await this.pool.query(
      `INSERT INTO projects.project (id, name, description, owner_id, owner_name, starts_at, ends_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        id,
        input.name,
        input.description,
        input.ownerId,
        input.ownerName,
        input.startsAt ?? null,
        input.endsAt ?? null,
        input.status
      ]
    );
    return mapProjectRow(r.rows[0]);
  }

  async updateProject(
    id: string,
    input: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>
  ): Promise<Project | null> {
    const sets: string[] = ["updated_at = now()"];
    const vals: unknown[] = [id];
    let idx = 2;
    for (const [k, v] of Object.entries(input)) {
      const col = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      sets.push(`${col} = $${idx++}`);
      vals.push(Array.isArray(v) ? v : (v ?? null));
    }
    const r = await this.pool.query(
      `UPDATE projects.project SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      vals
    );
    return r.rows[0] ? mapProjectRow(r.rows[0]) : null;
  }

  async listTasks(projectId: string): Promise<ProjectTask[]> {
    const r = await this.pool.query(
      "SELECT * FROM projects.task WHERE project_id = $1 ORDER BY updated_at DESC",
      [projectId]
    );
    return r.rows.map(mapTaskRow);
  }

  async createTask(
    input: Omit<ProjectTask, "id" | "createdAt" | "updatedAt">
  ): Promise<ProjectTask> {
    const id = randomUUID();
    const r = await this.pool.query(
      `INSERT INTO projects.task (id, project_id, title, description, assignee_id, assignee_name, priority, status, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        id,
        input.projectId,
        input.title,
        input.description,
        input.assigneeId ?? null,
        input.assigneeName ?? null,
        input.priority,
        input.status,
        input.dueDate ?? null
      ]
    );
    return mapTaskRow(r.rows[0]);
  }

  async updateTask(
    id: string,
    input: Partial<Omit<ProjectTask, "id" | "createdAt" | "updatedAt">>
  ): Promise<ProjectTask | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const prev = await client.query("SELECT status FROM projects.task WHERE id = $1 FOR UPDATE", [
        id
      ]);
      if (!prev.rows[0]) return null;

      const sets: string[] = ["updated_at = now()"];
      const vals: unknown[] = [id];
      let idx = 2;
      for (const [k, v] of Object.entries(input)) {
        const col = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        sets.push(`${col} = $${idx++}`);
        vals.push(v ?? null);
      }

      if (input.status === "done" && prev.rows[0].status !== "done") {
        sets.push("completed_at = now()");
      }

      const r = await client.query(
        `UPDATE projects.task SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
        vals
      );
      await client.query("COMMIT");
      return r.rows[0] ? mapTaskRow(r.rows[0]) : null;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async listComments(taskId: string): Promise<TaskComment[]> {
    const r = await this.pool.query(
      "SELECT * FROM projects.task_comment WHERE task_id = $1 ORDER BY created_at ASC",
      [taskId]
    );
    return r.rows.map(mapCommentRow);
  }

  async listMemberProjectIds(userId: string): Promise<Set<string>> {
    const r = await this.pool.query(
      "SELECT project_id FROM projects.project_member WHERE user_id = $1",
      [userId]
    );
    return new Set(r.rows.map((row: any) => row.project_id));
  }

  async addMember(
    projectId: string,
    userId: string,
    userName: string,
    memberRole: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO projects.project_member (project_id, user_id, user_name, member_role)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [projectId, userId, userName, memberRole]
    );
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const r = await this.pool.query(
      "SELECT project_id, user_id, user_name, member_role, joined_at FROM projects.project_member WHERE project_id = $1",
      [projectId]
    );
    return r.rows.map((row: any) => ({
      projectId: row.project_id,
      userId: row.user_id,
      userName: row.user_name,
      memberRole: row.member_role,
      joinedAt: String(row.joined_at)
    }));
  }

  async listProgress(projectId: string): Promise<ProgressReport[]> {
    const r = await this.pool.query(
      "SELECT * FROM projects.progress_report WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    return r.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      authorId: row.author_id,
      authorName: row.author_name,
      title: row.title,
      content: row.content,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  async createProgress(
    projectId: string,
    authorId: string,
    authorName: string,
    title: string,
    content: string
  ): Promise<ProgressReport> {
    const r = await this.pool.query(
      `INSERT INTO projects.progress_report (id, project_id, author_id, author_name, title, content)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), projectId, authorId, authorName, title, content]
    );
    const row = r.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      authorId: row.author_id,
      authorName: row.author_name,
      title: row.title,
      content: row.content,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  async createComment(input: Omit<TaskComment, "id" | "createdAt">): Promise<TaskComment> {
    const id = randomUUID();
    const r = await this.pool.query(
      `INSERT INTO projects.task_comment (id, task_id, author_id, author_name, content)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, input.taskId, input.authorId, input.authorName, input.content]
    );
    return mapCommentRow(r.rows[0]);
  }
}

// ── Row Mappers ────────────────────────────────────────

function mapProjectRow(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    ownerId: String(row.owner_id),
    ownerName: String(row.owner_name),
    startsAt: row.starts_at ? new Date(String(row.starts_at)).toISOString() : undefined,
    endsAt: row.ends_at ? new Date(String(row.ends_at)).toISOString() : undefined,
    status: row.status as ProjectStatus,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapTaskRow(row: Record<string, unknown>): ProjectTask {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title),
    description: String(row.description),
    assigneeId: row.assignee_id ? String(row.assignee_id) : undefined,
    assigneeName: row.assignee_name ? String(row.assignee_name) : undefined,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    dueDate: row.due_date ? new Date(String(row.due_date)).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapCommentRow(row: Record<string, unknown>): TaskComment {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    content: String(row.content),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

// ── Repository Factory ─────────────────────────────────

function createRepository(): ProjectRepository {
  if (!process.env.DATABASE_URL) {
    return new MemoryProjectRepository();
  }
  return new PostgresProjectRepository(process.env.DATABASE_URL);
}

// ── Plugin Manifest ────────────────────────────────────

export const projectsPlugin: PluginManifest = {
  name: "projects",
  version: "0.1.0",
  description: "项目管理模块，支持项目/课题组创建、任务管理与看板视图",
  capabilities: [
    "project:crud",
    "project:task-management",
    "project:member-management",
    "project:kanban"
  ],
  routes: [
    { method: "GET", path: "/projects", permission: "project:read", summary: "获取项目列表" },
    { method: "GET", path: "/projects/:id", permission: "project:read", summary: "获取项目详情" },
    { method: "POST", path: "/projects", permission: "project:write", summary: "创建项目" },
    { method: "PATCH", path: "/projects/:id", permission: "project:write", summary: "更新项目" },
    {
      method: "GET",
      path: "/projects/:id/members",
      permission: "project:read",
      summary: "获取项目成员"
    },
    {
      method: "GET",
      path: "/projects/:id/progress",
      permission: "project:read",
      summary: "获取进度报告"
    },
    {
      method: "POST",
      path: "/projects/:id/progress",
      permission: "project:progress",
      summary: "上传进度报告"
    },
    {
      method: "GET",
      path: "/projects/:id/tasks",
      permission: "project:read",
      summary: "获取项目任务列表"
    },
    {
      method: "POST",
      path: "/projects/:id/tasks",
      permission: "project:write",
      summary: "创建任务"
    },
    {
      method: "PATCH",
      path: "/projects/:id/tasks/:taskId",
      permission: "project:write",
      summary: "更新任务"
    },
    {
      method: "GET",
      path: "/projects/:id/tasks/:taskId/comments",
      permission: "project:read",
      summary: "获取任务评论"
    },
    {
      method: "POST",
      path: "/projects/:id/tasks/:taskId/comments",
      permission: "project:write",
      summary: "添加任务评论"
    }
  ],
  eventsPublished: [
    "projects.project.created",
    "projects.project.updated",
    "projects.task.created",
    "projects.task.updated",
    "projects.task.comment.added"
  ],
  eventsSubscribed: [],
  async activate(context) {
    const repo = createRepository();
    await repo.initialize();

    return {
      name: "projects",
      routes: [
        // GET /projects
        {
          method: "GET",
          path: "/projects",
          permission: "project:read",
          summary: "获取项目列表（角色过滤：学生看已加入的，教授看管理的，管理员看全部）",
          handler: async ({ actor }) => {
            const all = await repo.listProjects();
            if (!actor || actor.role === "lab_admin") return { body: all };
            const memberIds = await repo.listMemberProjectIds(actor.id);
            return { body: all.filter((p) => memberIds.has(p.id)) };
          }
        },
        // GET /projects/:id
        {
          method: "GET",
          path: "/projects/:id",
          permission: "project:read",
          summary: "获取项目详情",
          handler: async ({ params }) => {
            const project = await repo.getProject(params.id);
            if (!project) return { status: 404, body: { error: "项目未找到" } };
            return { body: project };
          }
        },
        // POST /projects
        {
          method: "POST",
          path: "/projects",
          permission: "project:write",
          summary: "创建项目",
          handler: async ({ actor, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const req = body as Partial<ProjectCreateRequest>;
            if (!req.name?.trim()) return { status: 400, body: { error: "项目名称不能为空" } };

            const isAdmin = actor.role === "lab_admin";
            const project = await repo.createProject({
              name: req.name.trim(),
              description: req.description?.trim() ?? "",
              ownerId: actor.id,
              ownerName: actor.displayName ?? actor.username ?? actor.id,
              startsAt: req.startsAt,
              endsAt: req.endsAt,
              status: isAdmin ? "active" : "pending"
            });

            // Auto-add creator as project member
            await repo.addMember(
              project.id,
              actor.id,
              actor.displayName ?? actor.username ?? actor.id,
              "manager"
            );

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.project.created", {
                projectId: project.id,
                name: project.name
              })
            );
            await context.audit.record({
              actorId: actor.id,
              action: "projects.project.created",
              targetType: "project",
              targetId: project.id,
              occurredAt: new Date().toISOString(),
              metadata: { name: project.name }
            });

            return { status: 201, body: project };
          }
        },
        // PATCH /projects/:id
        {
          method: "PATCH",
          path: "/projects/:id",
          permission: "project:write",
          summary: "更新项目",
          handler: async ({ actor, params, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const req = body as Partial<ProjectUpdateRequest>;
            const updateInput: Partial<ProjectUpdateRequest> = {};
            if (req.name !== undefined) updateInput.name = req.name?.trim();
            if (req.description !== undefined) updateInput.description = req.description?.trim();
            if (req.startsAt !== undefined) updateInput.startsAt = req.startsAt;
            if (req.endsAt !== undefined) updateInput.endsAt = req.endsAt;
            if (req.status !== undefined) updateInput.status = req.status;
            const project = await repo.updateProject(params.id, updateInput as any);
            if (!project) return { status: 404, body: { error: "项目未找到" } };

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.project.updated", { projectId: project.id })
            );
            await context.audit.record({
              actorId: actor.id,
              action: "projects.project.updated",
              targetType: "project",
              targetId: project.id,
              occurredAt: new Date().toISOString()
            });

            return { body: project };
          }
        },
        // GET /projects/:id/members
        {
          method: "GET",
          path: "/projects/:id/members",
          permission: "project:read",
          summary: "获取项目成员",
          handler: async ({ params }) => ({ body: await repo.listMembers(params.id) })
        },
        // GET /projects/:id/progress
        {
          method: "GET",
          path: "/projects/:id/progress",
          permission: "project:read",
          summary: "获取进度报告",
          handler: async ({ params }) => ({ body: await repo.listProgress(params.id) })
        },
        // POST /projects/:id/progress
        {
          method: "POST",
          path: "/projects/:id/progress",
          permission: "project:progress",
          summary: "上传进度报告",
          handler: async ({ actor, params, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const req = body as any;
            if (!req.title?.trim()) return { status: 400, body: { error: "title required" } };
            const report = await repo.createProgress(
              params.id,
              actor.id,
              actor.displayName ?? actor.username ?? "",
              req.title,
              req.content ?? ""
            );
            return { status: 201, body: report };
          }
        },
        // GET /projects/:id/tasks
        {
          method: "GET",
          path: "/projects/:id/tasks",
          permission: "project:read",
          summary: "获取项目任务列表",
          handler: async ({ params }) => ({ body: await repo.listTasks(params.id) })
        },
        // POST /projects/:id/tasks
        {
          method: "POST",
          path: "/projects/:id/tasks",
          permission: "project:write",
          summary: "创建任务",
          handler: async ({ actor, params, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const req = body as Partial<TaskCreateRequest>;
            if (!req.title?.trim()) return { status: 400, body: { error: "任务标题不能为空" } };

            const project = await repo.getProject(params.id);
            if (!project) return { status: 404, body: { error: "项目未找到" } };

            const assigneeName = req.assigneeId
              ? project.memberIds.includes(req.assigneeId)
                ? `成员 ${req.assigneeId}`
                : undefined
              : undefined;

            const task = await repo.createTask({
              projectId: params.id,
              title: req.title.trim(),
              description: req.description?.trim() ?? "",
              assigneeId: req.assigneeId,
              assigneeName,
              priority: req.priority ?? "medium",
              status: "todo",
              dueDate: req.dueDate
            });

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.task.created", {
                taskId: task.id,
                projectId: params.id
              })
            );
            await context.audit.record({
              actorId: actor.id,
              action: "projects.task.created",
              targetType: "task",
              targetId: task.id,
              occurredAt: new Date().toISOString(),
              metadata: { projectId: params.id, title: task.title }
            });

            return { status: 201, body: task };
          }
        },
        // PATCH /projects/:id/tasks/:taskId
        {
          method: "PATCH",
          path: "/projects/:id/tasks/:taskId",
          permission: "project:write",
          summary: "更新任务",
          handler: async ({ actor, params, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const req = body as Partial<TaskUpdateRequest>;
            const task = await repo.updateTask(params.taskId, {
              title: req.title?.trim(),
              description: req.description?.trim(),
              assigneeId: req.assigneeId,
              priority: req.priority,
              status: req.status,
              dueDate: req.dueDate
            });
            if (!task) return { status: 404, body: { error: "任务未找到" } };

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.task.updated", {
                taskId: task.id,
                projectId: params.id,
                status: task.status
              })
            );
            await context.audit.record({
              actorId: actor.id,
              action: "projects.task.updated",
              targetType: "task",
              targetId: task.id,
              occurredAt: new Date().toISOString(),
              metadata: { projectId: params.id, status: task.status }
            });

            return { body: task };
          }
        },
        // GET /projects/:id/tasks/:taskId/comments
        {
          method: "GET",
          path: "/projects/:id/tasks/:taskId/comments",
          permission: "project:read",
          summary: "获取任务评论",
          handler: async ({ params }) => ({ body: await repo.listComments(params.taskId) })
        },
        // POST /projects/:id/tasks/:taskId/comments
        {
          method: "POST",
          path: "/projects/:id/tasks/:taskId/comments",
          permission: "project:write",
          summary: "添加任务评论",
          handler: async ({ actor, params, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const req = body as Partial<CommentCreateRequest>;
            if (!req.content?.trim()) return { status: 400, body: { error: "评论内容不能为空" } };

            const comment = await repo.createComment({
              taskId: params.taskId,
              authorId: actor.id,
              authorName: actor.displayName ?? actor.username ?? actor.id,
              content: req.content.trim()
            });

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.task.comment.added", {
                taskId: params.taskId,
                commentId: comment.id
              })
            );
            await context.audit.record({
              actorId: actor.id,
              action: "projects.task.comment.added",
              targetType: "task_comment",
              targetId: comment.id,
              occurredAt: new Date().toISOString(),
              metadata: { taskId: params.taskId }
            });

            return { status: 201, body: comment };
          }
        }
      ]
    };
  }
};
