import type { Actor, IdentityType, ManagedUser, PluginManifest } from "@lab/core";
import { createDomainEvent } from "@lab/core";
import { randomUUID } from "node:crypto";
import pg from "pg";

type ProjectStatus = "pending" | "active" | "archived" | "completed";
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type MemberRole = "owner" | "leader" | "member" | "advisor" | "observer";

interface Project {
  id: string;
  name: string;
  description: string;
  ownerUserId: string;
  ownerName: string;
  ownerIdentityNo: string;
  advisorUserId?: string;
  advisorName?: string;
  advisorIdentityNo?: string;
  startsAt?: string;
  endsAt?: string;
  status: ProjectStatus;
  reportCycleDays: number;
  lastReportAt?: string;
  nextReportDueAt?: string;
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
  assigneeIdentityNo?: string;
  creatorUserId?: string;
  reviewerUserId?: string;
  treeNodeId?: string;
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

interface ProjectMember {
  projectId: string;
  userId: string;
  userName: string;
  identityType: IdentityType;
  identityNo: string;
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
  treeSnapshotId?: string;
  summary?: string;
  nextPlan?: string;
  helpNeeded?: string;
  status?: "draft" | "submitted" | "reviewed" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface ProjectReportDetail extends ProgressReport {
  memberWork: ProjectReportMemberWork[];
  treeSnapshot?: ProjectTreeSnapshot;
}

type TreeNodeStatus = "todo" | "doing" | "done";

interface ProjectTreeNode {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  status: TreeNodeStatus;
  sortOrder: number;
  ownerUserId?: string;
  ownerName?: string;
  ownerIdentityNo?: string;
  remark?: string;
  deliverableNote?: string;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectTreeSnapshot {
  id: string;
  projectId: string;
  version: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  nodes: ProjectTreeNode[];
}

interface ProjectReportMemberWork {
  id: string;
  reportId: string;
  userId?: string;
  memberName: string;
  memberIdentityNo?: string;
  workSummary: string;
  progressStatus: TreeNodeStatus;
  createdAt: string;
}

interface ProjectCreateRequest {
  name: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  ownerName?: string;
  ownerIdentityNo?: string;
  ownerUserId?: string;
  advisorName?: string;
  advisorIdentityNo?: string;
  advisorUserId?: string;
  reportCycleDays?: number;
  initialMembers?: Array<{ userId: string; memberRole?: Exclude<MemberRole, "owner" | "advisor"> }>;
}

interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status?: ProjectStatus;
  ownerUserId?: string;
  advisorUserId?: string | null;
  reportCycleDays?: number;
  lastReportAt?: string | null;
  nextReportDueAt?: string | null;
}

interface ProjectMemberWriteRequest {
  userId?: string;
  userName?: string;
  identityNo?: string;
  memberRole?: MemberRole;
}

interface TaskCreateRequest {
  title: string;
  description?: string;
  assigneeId?: string;
  reviewerUserId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

interface TaskUpdateRequest {
  title?: string;
  description?: string;
  assigneeId?: string;
  reviewerUserId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
}

interface CommentCreateRequest {
  content?: string;
}

interface CreateProgressRequest {
  title?: string;
  content?: string;
  summary?: string;
  nextPlan?: string;
  helpNeeded?: string;
  memberWork?: Array<{
    userId?: string;
    memberName: string;
    memberIdentityNo?: string;
    workSummary: string;
    progressStatus: TreeNodeStatus;
  }>;
}

interface TreeNodeWriteRequest {
  id?: string;
  parentId?: string;
  title: string;
  status: TreeNodeStatus;
  sortOrder?: number;
  ownerUserId?: string;
  remark?: string;
  deliverableNote?: string;
  collapsed?: boolean;
}

interface ReportUpdateRequest extends CreateProgressRequest {
  status?: "draft" | "submitted" | "reviewed" | "archived";
}

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
  getTask(taskId: string): Promise<ProjectTask | null>;
  createTask(input: Omit<ProjectTask, "id" | "createdAt" | "updatedAt">): Promise<ProjectTask>;
  updateTask(
    id: string,
    input: Partial<Omit<ProjectTask, "id" | "createdAt" | "updatedAt">>
  ): Promise<ProjectTask | null>;
  listComments(taskId: string): Promise<TaskComment[]>;
  createComment(input: Omit<TaskComment, "id" | "createdAt">): Promise<TaskComment>;
  listMemberProjectIds(userId: string): Promise<Set<string>>;
  upsertMember(input: ProjectMember): Promise<void>;
  removeMember(projectId: string, userId: string): Promise<void>;
  listMembers(projectId: string): Promise<ProjectMember[]>;
  findMember(projectId: string, userId: string): Promise<ProjectMember | null>;
  listProgress(projectId: string): Promise<ProgressReport[]>;
  createProgress(
    projectId: string,
    authorId: string,
    authorName: string,
    input: Omit<
      ProgressReport,
      "id" | "projectId" | "authorId" | "authorName" | "createdAt" | "updatedAt"
    >
  ): Promise<ProgressReport>;
  listProjectTree(projectId: string): Promise<ProjectTreeNode[]>;
  saveProjectTree(projectId: string, nodes: ProjectTreeNode[]): Promise<ProjectTreeNode[]>;
  createTreeSnapshot(
    projectId: string,
    createdBy: string,
    createdByName: string
  ): Promise<ProjectTreeSnapshot>;
  listTreeSnapshots(projectId: string): Promise<ProjectTreeSnapshot[]>;
  getTreeSnapshot(projectId: string, snapshotId: string): Promise<ProjectTreeSnapshot | null>;
  createReportMemberWork(
    input: Omit<ProjectReportMemberWork, "id" | "createdAt">
  ): Promise<ProjectReportMemberWork>;
  listReportMemberWork(reportId: string): Promise<ProjectReportMemberWork[]>;
}

const seedProjects: Project[] = [
  {
    id: "proj-001",
    name: "细胞培养条件优化",
    description: "探究不同培养基配方对Hela细胞生长速率的影响，建立最优培养方案。",
    ownerUserId: "u-student001",
    ownerName: "学生一号",
    ownerIdentityNo: "STU-001",
    advisorUserId: "u-prof001",
    advisorName: "张教授",
    advisorIdentityNo: "EMP-PROF-001",
    startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 23).toISOString(),
    status: "active",
    reportCycleDays: 14,
    nextReportDueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  }
];

const seedMembers: ProjectMember[] = [
  {
    projectId: "proj-001",
    userId: "u-student001",
    userName: "学生一号",
    identityType: "student_no",
    identityNo: "STU-001",
    memberRole: "owner",
    joinedAt: new Date().toISOString()
  },
  {
    projectId: "proj-001",
    userId: "u-prof001",
    userName: "张教授",
    identityType: "employee_no",
    identityNo: "EMP-PROF-001",
    memberRole: "advisor",
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
    assigneeIdentityNo: "STU-001",
    creatorUserId: "u-prof001",
    reviewerUserId: "u-prof001",
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
    assigneeIdentityNo: "STU-001",
    creatorUserId: "u-prof001",
    reviewerUserId: "u-prof001",
    priority: "medium",
    status: "todo",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  }
];

const seedTreeNodes: ProjectTreeNode[] = [
  {
    id: "tree-001",
    projectId: "proj-001",
    title: "文献调研与方案确定",
    status: "doing",
    sortOrder: 1,
    ownerUserId: "u-student001",
    ownerName: "学生一号",
    ownerIdentityNo: "STU-001",
    remark: "查阅近三年文献并整理培养基方案",
    deliverableNote: "完成 5 种方案对比",
    collapsed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: "tree-002",
    projectId: "proj-001",
    parentId: "tree-001",
    title: "配方实验设计",
    status: "todo",
    sortOrder: 2,
    ownerUserId: "u-prof001",
    ownerName: "张教授",
    ownerIdentityNo: "EMP-PROF-001",
    remark: "制定 3 组条件梯度",
    deliverableNote: "实验设计表",
    collapsed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];

class MemoryProjectRepository implements ProjectRepository {
  private readonly projects = structuredClone(seedProjects);
  private readonly tasks = structuredClone(seedTasks);
  private readonly treeNodes = structuredClone(seedTreeNodes);
  private readonly treeSnapshots: ProjectTreeSnapshot[] = [];
  private readonly reportMemberWork: ProjectReportMemberWork[] = [];
  private readonly comments: TaskComment[] = [];
  private readonly members = structuredClone(seedMembers);
  private readonly progressReports: ProgressReport[] = [];

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async listProjects(): Promise<Project[]> {
    return [...this.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.find((project) => project.id === id) ?? null;
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
    const index = this.projects.findIndex((project) => project.id === id);
    if (index === -1) {
      return null;
    }
    this.projects[index] = {
      ...this.projects[index],
      ...input,
      updatedAt: new Date().toISOString()
    };
    return this.projects[index];
  }

  async listTasks(projectId: string): Promise<ProjectTask[]> {
    return this.tasks
      .filter((task) => task.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTask(taskId: string): Promise<ProjectTask | null> {
    return this.tasks.find((task) => task.id === taskId) ?? null;
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
    const index = this.tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return null;
    }
    const current = this.tasks[index];
    const nextStatus = input.status ?? current.status;
    this.tasks[index] = {
      ...current,
      ...input,
      completedAt:
        nextStatus === "done" && current.status !== "done"
          ? new Date().toISOString()
          : nextStatus !== "done"
            ? undefined
            : current.completedAt,
      updatedAt: new Date().toISOString()
    };
    return this.tasks[index];
  }

  async listComments(taskId: string): Promise<TaskComment[]> {
    return this.comments
      .filter((comment) => comment.taskId === taskId)
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
    return new Set(
      this.members.filter((member) => member.userId === userId).map((member) => member.projectId)
    );
  }

  async upsertMember(input: ProjectMember): Promise<void> {
    const index = this.members.findIndex(
      (member) => member.projectId === input.projectId && member.userId === input.userId
    );
    if (index === -1) {
      this.members.push(input);
      return;
    }
    this.members[index] = { ...this.members[index], ...input };
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const index = this.members.findIndex(
      (member) => member.projectId === projectId && member.userId === userId
    );
    if (index !== -1) {
      this.members.splice(index, 1);
    }
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    return this.members.filter((member) => member.projectId === projectId);
  }

  async findMember(projectId: string, userId: string): Promise<ProjectMember | null> {
    return (
      this.members.find((member) => member.projectId === projectId && member.userId === userId) ??
      null
    );
  }

  async listProgress(projectId: string): Promise<ProgressReport[]> {
    return this.progressReports.filter((report) => report.projectId === projectId);
  }

  async createProgress(
    projectId: string,
    authorId: string,
    authorName: string,
    input: Omit<
      ProgressReport,
      "id" | "projectId" | "authorId" | "authorName" | "createdAt" | "updatedAt"
    >
  ): Promise<ProgressReport> {
    const report: ProgressReport = {
      id: randomUUID(),
      projectId,
      authorId,
      authorName,
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.progressReports.unshift(report);
    return report;
  }

  async listProjectTree(projectId: string): Promise<ProjectTreeNode[]> {
    return this.treeNodes
      .filter((node) => node.projectId === projectId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveProjectTree(projectId: string, nodes: ProjectTreeNode[]): Promise<ProjectTreeNode[]> {
    for (let index = this.treeNodes.length - 1; index >= 0; index -= 1) {
      if (this.treeNodes[index]?.projectId === projectId) {
        this.treeNodes.splice(index, 1);
      }
    }
    this.treeNodes.push(...nodes);
    return this.listProjectTree(projectId);
  }

  async createTreeSnapshot(
    projectId: string,
    createdBy: string,
    createdByName: string
  ): Promise<ProjectTreeSnapshot> {
    const versions = this.treeSnapshots.filter((snapshot) => snapshot.projectId === projectId);
    const snapshot: ProjectTreeSnapshot = {
      id: randomUUID(),
      projectId,
      version: versions.length + 1,
      createdBy,
      createdByName,
      createdAt: new Date().toISOString(),
      nodes: await this.listProjectTree(projectId)
    };
    this.treeSnapshots.unshift(snapshot);
    return snapshot;
  }

  async listTreeSnapshots(projectId: string): Promise<ProjectTreeSnapshot[]> {
    return this.treeSnapshots.filter((snapshot) => snapshot.projectId === projectId);
  }

  async getTreeSnapshot(
    projectId: string,
    snapshotId: string
  ): Promise<ProjectTreeSnapshot | null> {
    return (
      this.treeSnapshots.find(
        (snapshot) => snapshot.projectId === projectId && snapshot.id === snapshotId
      ) ?? null
    );
  }

  async createReportMemberWork(
    input: Omit<ProjectReportMemberWork, "id" | "createdAt">
  ): Promise<ProjectReportMemberWork> {
    const work: ProjectReportMemberWork = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.reportMemberWork.unshift(work);
    return work;
  }

  async listReportMemberWork(reportId: string): Promise<ProjectReportMemberWork[]> {
    return this.reportMemberWork.filter((item) => item.reportId === reportId);
  }
}

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
        owner_user_id TEXT,
        owner_identity_no TEXT NOT NULL DEFAULT '',
        advisor_user_id TEXT,
        advisor_name TEXT,
        advisor_identity_no TEXT,
        starts_at TIMESTAMPTZ,
        ends_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'archived', 'completed')),
        report_cycle_days INTEGER NOT NULL DEFAULT 14,
        last_report_at TIMESTAMPTZ,
        next_report_due_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS owner_identity_no TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS advisor_user_id TEXT;
      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS advisor_name TEXT;
      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS advisor_identity_no TEXT;
      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS report_cycle_days INTEGER NOT NULL DEFAULT 14;
      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS last_report_at TIMESTAMPTZ;
      ALTER TABLE projects.project ADD COLUMN IF NOT EXISTS next_report_due_at TIMESTAMPTZ;

      UPDATE projects.project
      SET owner_user_id = COALESCE(owner_user_id, owner_id),
          owner_identity_no = CASE WHEN owner_identity_no = '' THEN owner_id ELSE owner_identity_no END
      WHERE owner_user_id IS NULL OR owner_identity_no = '';

      ALTER TABLE projects.project DROP CONSTRAINT IF EXISTS project_status_check;
      ALTER TABLE projects.project ADD CONSTRAINT project_status_check
        CHECK (status IN ('pending', 'active', 'archived', 'completed'));

      CREATE TABLE IF NOT EXISTS projects.project_member (
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL DEFAULT '',
        identity_type TEXT NOT NULL DEFAULT 'student_no' CHECK (identity_type IN ('student_no', 'employee_no')),
        identity_no TEXT NOT NULL DEFAULT '',
        member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('owner','leader','member','advisor','observer')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (project_id, user_id)
      );

      ALTER TABLE projects.project_member ADD COLUMN IF NOT EXISTS identity_type TEXT NOT NULL DEFAULT 'student_no';
      ALTER TABLE projects.project_member ADD COLUMN IF NOT EXISTS identity_no TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects.project_member DROP CONSTRAINT IF EXISTS project_member_member_role_check;

      UPDATE projects.project_member
      SET member_role = CASE
            WHEN member_role = 'manager' THEN 'advisor'
            WHEN member_role = 'leader' THEN 'owner'
            ELSE member_role
          END
      WHERE member_role IN ('manager', 'leader');

      ALTER TABLE projects.project_member ADD CONSTRAINT project_member_member_role_check
        CHECK (member_role IN ('owner','leader','member','advisor','observer'));

      CREATE TABLE IF NOT EXISTS projects.progress_report (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tree_snapshot_id TEXT,
        summary TEXT NOT NULL DEFAULT '',
        next_plan TEXT NOT NULL DEFAULT '',
        help_needed TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed', 'archived')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE projects.progress_report ADD COLUMN IF NOT EXISTS tree_snapshot_id TEXT;
      ALTER TABLE projects.progress_report ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects.progress_report ADD COLUMN IF NOT EXISTS next_plan TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects.progress_report ADD COLUMN IF NOT EXISTS help_needed TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects.progress_report ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted';

      CREATE TABLE IF NOT EXISTS projects.project_tree_node (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        parent_id TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        owner_user_id TEXT,
        owner_name TEXT,
        owner_identity_no TEXT,
        remark TEXT,
        deliverable_note TEXT,
        collapsed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS projects.project_tree_snapshot (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_by_name TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS projects.project_tree_snapshot_node (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL REFERENCES projects.project_tree_snapshot(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        parent_id TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        owner_user_id TEXT,
        owner_name TEXT,
        owner_identity_no TEXT,
        remark TEXT,
        deliverable_note TEXT,
        collapsed BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS projects.project_report_member_work (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL REFERENCES projects.progress_report(id) ON DELETE CASCADE,
        user_id TEXT,
        member_name TEXT NOT NULL,
        member_identity_no TEXT,
        work_summary TEXT NOT NULL,
        progress_status TEXT NOT NULL DEFAULT 'doing' CHECK (progress_status IN ('todo', 'doing', 'done')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS projects.task (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects.project(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        assignee_id TEXT,
        assignee_name TEXT,
        assignee_identity_no TEXT,
        creator_user_id TEXT,
        reviewer_user_id TEXT,
        tree_node_id TEXT,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE projects.task ADD COLUMN IF NOT EXISTS assignee_identity_no TEXT;
      ALTER TABLE projects.task ADD COLUMN IF NOT EXISTS creator_user_id TEXT;
      ALTER TABLE projects.task ADD COLUMN IF NOT EXISTS reviewer_user_id TEXT;
      ALTER TABLE projects.task ADD COLUMN IF NOT EXISTS tree_node_id TEXT;

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
      CREATE INDEX IF NOT EXISTS tree_project_idx ON projects.project_tree_node(project_id, sort_order);
      CREATE INDEX IF NOT EXISTS tree_snapshot_project_idx ON projects.project_tree_snapshot(project_id, version DESC);
      CREATE INDEX IF NOT EXISTS report_member_work_idx ON projects.project_report_member_work(report_id);
    `);

    const count = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM projects.project"
    );
    if (Number(count.rows[0]?.count ?? 0) === 0) {
      for (const project of seedProjects) {
        await this.pool.query(
          `INSERT INTO projects.project (
            id, name, description, owner_id, owner_name, owner_user_id, owner_identity_no,
            advisor_user_id, advisor_name, advisor_identity_no, starts_at, ends_at, status,
            report_cycle_days, last_report_at, next_report_due_at, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
          )`,
          [
            project.id,
            project.name,
            project.description,
            project.ownerUserId,
            project.ownerName,
            project.ownerUserId,
            project.ownerIdentityNo,
            project.advisorUserId ?? null,
            project.advisorName ?? null,
            project.advisorIdentityNo ?? null,
            project.startsAt ?? null,
            project.endsAt ?? null,
            project.status,
            project.reportCycleDays,
            project.lastReportAt ?? null,
            project.nextReportDueAt ?? null,
            project.createdAt,
            project.updatedAt
          ]
        );
      }
      for (const task of seedTasks) {
        await this.pool.query(
          `INSERT INTO projects.task (
            id, project_id, title, description, assignee_id, assignee_name, assignee_identity_no,
            creator_user_id, reviewer_user_id, priority, status, due_date, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
          )`,
          [
            task.id,
            task.projectId,
            task.title,
            task.description,
            task.assigneeId ?? null,
            task.assigneeName ?? null,
            task.assigneeIdentityNo ?? null,
            task.creatorUserId ?? null,
            task.reviewerUserId ?? null,
            task.priority,
            task.status,
            task.dueDate ?? null,
            task.createdAt,
            task.updatedAt
          ]
        );
      }
    }

    for (const member of seedMembers) {
      await this.upsertMember(member);
    }

    const treeCount = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM projects.project_tree_node"
    );
    if (Number(treeCount.rows[0]?.count ?? 0) === 0) {
      for (const node of seedTreeNodes) {
        await this.pool.query(
          `INSERT INTO projects.project_tree_node (
            id, project_id, parent_id, title, status, sort_order, owner_user_id, owner_name,
            owner_identity_no, remark, deliverable_note, collapsed, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
          )`,
          [
            node.id,
            node.projectId,
            node.parentId ?? null,
            node.title,
            node.status,
            node.sortOrder,
            node.ownerUserId ?? null,
            node.ownerName ?? null,
            node.ownerIdentityNo ?? null,
            node.remark ?? null,
            node.deliverableNote ?? null,
            node.collapsed,
            node.createdAt,
            node.updatedAt
          ]
        );
      }
    }
  }

  async listProjects(): Promise<Project[]> {
    const result = await this.pool.query("SELECT * FROM projects.project ORDER BY updated_at DESC");
    return result.rows.map(mapProjectRow);
  }

  async getProject(id: string): Promise<Project | null> {
    const result = await this.pool.query("SELECT * FROM projects.project WHERE id = $1", [id]);
    return result.rows[0] ? mapProjectRow(result.rows[0]) : null;
  }

  async createProject(input: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const result = await this.pool.query(
      `INSERT INTO projects.project (
        id, name, description, owner_id, owner_name, owner_user_id, owner_identity_no,
        advisor_user_id, advisor_name, advisor_identity_no, starts_at, ends_at, status,
        report_cycle_days, last_report_at, next_report_due_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      ) RETURNING *`,
      [
        randomUUID(),
        input.name,
        input.description,
        input.ownerUserId,
        input.ownerName,
        input.ownerUserId,
        input.ownerIdentityNo,
        input.advisorUserId ?? null,
        input.advisorName ?? null,
        input.advisorIdentityNo ?? null,
        input.startsAt ?? null,
        input.endsAt ?? null,
        input.status,
        input.reportCycleDays,
        input.lastReportAt ?? null,
        input.nextReportDueAt ?? null
      ]
    );
    return mapProjectRow(result.rows[0]);
  }

  async updateProject(
    id: string,
    input: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>
  ): Promise<Project | null> {
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return this.getProject(id);
    }

    const columns: Record<string, string> = {
      name: "name",
      description: "description",
      ownerUserId: "owner_user_id",
      ownerName: "owner_name",
      ownerIdentityNo: "owner_identity_no",
      advisorUserId: "advisor_user_id",
      advisorName: "advisor_name",
      advisorIdentityNo: "advisor_identity_no",
      startsAt: "starts_at",
      endsAt: "ends_at",
      status: "status",
      reportCycleDays: "report_cycle_days",
      lastReportAt: "last_report_at",
      nextReportDueAt: "next_report_due_at"
    };
    const sets = ["updated_at = now()", "owner_id = COALESCE($2, owner_id)"];
    const values: unknown[] = [id, null];
    let index = 3;

    for (const [key, value] of entries) {
      const column = columns[key];
      if (!column) {
        continue;
      }
      sets.push(`${column} = $${index}`);
      values.push(value ?? null);
      if (key === "ownerUserId") {
        values[1] = value;
      }
      index += 1;
    }

    const result = await this.pool.query(
      `UPDATE projects.project SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0] ? mapProjectRow(result.rows[0]) : null;
  }

  async listTasks(projectId: string): Promise<ProjectTask[]> {
    const result = await this.pool.query(
      "SELECT * FROM projects.task WHERE project_id = $1 ORDER BY updated_at DESC",
      [projectId]
    );
    return result.rows.map(mapTaskRow);
  }

  async getTask(taskId: string): Promise<ProjectTask | null> {
    const result = await this.pool.query("SELECT * FROM projects.task WHERE id = $1", [taskId]);
    return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
  }

  async createTask(
    input: Omit<ProjectTask, "id" | "createdAt" | "updatedAt">
  ): Promise<ProjectTask> {
    const result = await this.pool.query(
      `INSERT INTO projects.task (
        id, project_id, title, description, assignee_id, assignee_name, assignee_identity_no,
        creator_user_id, reviewer_user_id, tree_node_id, priority, status, due_date
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      ) RETURNING *`,
      [
        randomUUID(),
        input.projectId,
        input.title,
        input.description,
        input.assigneeId ?? null,
        input.assigneeName ?? null,
        input.assigneeIdentityNo ?? null,
        input.creatorUserId ?? null,
        input.reviewerUserId ?? null,
        input.treeNodeId ?? null,
        input.priority,
        input.status,
        input.dueDate ?? null
      ]
    );
    return mapTaskRow(result.rows[0]);
  }

  async updateTask(
    id: string,
    input: Partial<Omit<ProjectTask, "id" | "createdAt" | "updatedAt">>
  ): Promise<ProjectTask | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT status FROM projects.task WHERE id = $1 FOR UPDATE",
        [id]
      );
      if (!current.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }
      const columns: Record<string, string> = {
        title: "title",
        description: "description",
        assigneeId: "assignee_id",
        assigneeName: "assignee_name",
        assigneeIdentityNo: "assignee_identity_no",
        creatorUserId: "creator_user_id",
        reviewerUserId: "reviewer_user_id",
        treeNodeId: "tree_node_id",
        priority: "priority",
        status: "status",
        dueDate: "due_date"
      };
      const sets = ["updated_at = now()"];
      const values: unknown[] = [id];
      let index = 2;
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined) {
          continue;
        }
        const column = columns[key];
        if (!column) {
          continue;
        }
        sets.push(`${column} = $${index}`);
        values.push(value ?? null);
        index += 1;
      }
      if (
        (input.status ?? current.rows[0].status) === "done" &&
        current.rows[0].status !== "done"
      ) {
        sets.push("completed_at = now()");
      } else if (input.status && input.status !== "done") {
        sets.push("completed_at = NULL");
      }
      const result = await client.query(
        `UPDATE projects.task SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
        values
      );
      await client.query("COMMIT");
      return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listComments(taskId: string): Promise<TaskComment[]> {
    const result = await this.pool.query(
      "SELECT * FROM projects.task_comment WHERE task_id = $1 ORDER BY created_at ASC",
      [taskId]
    );
    return result.rows.map(mapCommentRow);
  }

  async createComment(input: Omit<TaskComment, "id" | "createdAt">): Promise<TaskComment> {
    const result = await this.pool.query(
      `INSERT INTO projects.task_comment (id, task_id, author_id, author_name, content)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [randomUUID(), input.taskId, input.authorId, input.authorName, input.content]
    );
    return mapCommentRow(result.rows[0]);
  }

  async listMemberProjectIds(userId: string): Promise<Set<string>> {
    const result = await this.pool.query(
      "SELECT project_id FROM projects.project_member WHERE user_id = $1",
      [userId]
    );
    return new Set(result.rows.map((row: Record<string, unknown>) => String(row.project_id)));
  }

  async upsertMember(input: ProjectMember): Promise<void> {
    await this.pool.query(
      `INSERT INTO projects.project_member (
        project_id, user_id, user_name, identity_type, identity_no, member_role, joined_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7
      ) ON CONFLICT (project_id, user_id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        identity_type = EXCLUDED.identity_type,
        identity_no = EXCLUDED.identity_no,
        member_role = EXCLUDED.member_role`,
      [
        input.projectId,
        input.userId,
        input.userName,
        input.identityType,
        input.identityNo,
        input.memberRole,
        input.joinedAt
      ]
    );
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.pool.query(
      "DELETE FROM projects.project_member WHERE project_id = $1 AND user_id = $2",
      [projectId, userId]
    );
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const result = await this.pool.query(
      `SELECT project_id, user_id, user_name, identity_type, identity_no, member_role, joined_at
       FROM projects.project_member
       WHERE project_id = $1
       ORDER BY joined_at ASC`,
      [projectId]
    );
    return result.rows.map(mapMemberRow);
  }

  async findMember(projectId: string, userId: string): Promise<ProjectMember | null> {
    const result = await this.pool.query(
      `SELECT project_id, user_id, user_name, identity_type, identity_no, member_role, joined_at
       FROM projects.project_member
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return result.rows[0] ? mapMemberRow(result.rows[0]) : null;
  }

  async listProgress(projectId: string): Promise<ProgressReport[]> {
    const result = await this.pool.query(
      "SELECT * FROM projects.progress_report WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    return result.rows.map(mapProgressRow);
  }

  async createProgress(
    projectId: string,
    authorId: string,
    authorName: string,
    input: Omit<
      ProgressReport,
      "id" | "projectId" | "authorId" | "authorName" | "createdAt" | "updatedAt"
    >
  ): Promise<ProgressReport> {
    const result = await this.pool.query(
      `INSERT INTO projects.progress_report (
        id, project_id, author_id, author_name, title, content, tree_snapshot_id,
        summary, next_plan, help_needed, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        randomUUID(),
        projectId,
        authorId,
        authorName,
        input.title,
        input.content,
        input.treeSnapshotId ?? null,
        input.summary ?? "",
        input.nextPlan ?? "",
        input.helpNeeded ?? "",
        input.status ?? "submitted"
      ]
    );
    return mapProgressRow(result.rows[0]);
  }

  async listProjectTree(projectId: string): Promise<ProjectTreeNode[]> {
    const result = await this.pool.query(
      `SELECT * FROM projects.project_tree_node WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [projectId]
    );
    return result.rows.map(mapTreeNodeRow);
  }

  async saveProjectTree(projectId: string, nodes: ProjectTreeNode[]): Promise<ProjectTreeNode[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM projects.project_tree_node WHERE project_id = $1", [
        projectId
      ]);
      for (const node of nodes) {
        await client.query(
          `INSERT INTO projects.project_tree_node (
            id, project_id, parent_id, title, status, sort_order, owner_user_id, owner_name,
            owner_identity_no, remark, deliverable_note, collapsed, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
          )`,
          [
            node.id,
            projectId,
            node.parentId ?? null,
            node.title,
            node.status,
            node.sortOrder,
            node.ownerUserId ?? null,
            node.ownerName ?? null,
            node.ownerIdentityNo ?? null,
            node.remark ?? null,
            node.deliverableNote ?? null,
            node.collapsed,
            node.createdAt,
            node.updatedAt
          ]
        );
      }
      await client.query("COMMIT");
      return nodes;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createTreeSnapshot(
    projectId: string,
    createdBy: string,
    createdByName: string
  ): Promise<ProjectTreeSnapshot> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const versionResult = await client.query<{ version: number }>(
        "SELECT COALESCE(MAX(version), 0) + 1 AS version FROM projects.project_tree_snapshot WHERE project_id = $1",
        [projectId]
      );
      const snapshotId = randomUUID();
      const version = Number(versionResult.rows[0]?.version ?? 1);
      await client.query(
        `INSERT INTO projects.project_tree_snapshot (id, project_id, version, created_by, created_by_name)
         VALUES ($1,$2,$3,$4,$5)`,
        [snapshotId, projectId, version, createdBy, createdByName]
      );
      const nodes = await this.listProjectTree(projectId);
      for (const node of nodes) {
        await client.query(
          `INSERT INTO projects.project_tree_snapshot_node (
            id, snapshot_id, project_id, node_id, parent_id, title, status, sort_order, owner_user_id,
            owner_name, owner_identity_no, remark, deliverable_note, collapsed
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
          )`,
          [
            randomUUID(),
            snapshotId,
            projectId,
            node.id,
            node.parentId ?? null,
            node.title,
            node.status,
            node.sortOrder,
            node.ownerUserId ?? null,
            node.ownerName ?? null,
            node.ownerIdentityNo ?? null,
            node.remark ?? null,
            node.deliverableNote ?? null,
            node.collapsed
          ]
        );
      }
      await client.query("COMMIT");
      return {
        id: snapshotId,
        projectId,
        version,
        createdBy,
        createdByName,
        createdAt: new Date().toISOString(),
        nodes
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listTreeSnapshots(projectId: string): Promise<ProjectTreeSnapshot[]> {
    const snapshots = await this.pool.query(
      `SELECT * FROM projects.project_tree_snapshot WHERE project_id = $1 ORDER BY version DESC`,
      [projectId]
    );
    const nodeRows = await this.pool.query(
      `SELECT * FROM projects.project_tree_snapshot_node WHERE project_id = $1 ORDER BY sort_order ASC`,
      [projectId]
    );
    return snapshots.rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      version: Number(row.version),
      createdBy: String(row.created_by),
      createdByName: String(row.created_by_name),
      createdAt: new Date(String(row.created_at)).toISOString(),
      nodes: nodeRows.rows
        .filter((node) => String(node.snapshot_id) === String(row.id))
        .map(mapTreeSnapshotNodeRow)
    }));
  }

  async getTreeSnapshot(
    projectId: string,
    snapshotId: string
  ): Promise<ProjectTreeSnapshot | null> {
    const snapshots = await this.listTreeSnapshots(projectId);
    return snapshots.find((snapshot) => snapshot.id === snapshotId) ?? null;
  }

  async createReportMemberWork(
    input: Omit<ProjectReportMemberWork, "id" | "createdAt">
  ): Promise<ProjectReportMemberWork> {
    const result = await this.pool.query(
      `INSERT INTO projects.project_report_member_work (
        id, report_id, user_id, member_name, member_identity_no, work_summary, progress_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        randomUUID(),
        input.reportId,
        input.userId ?? null,
        input.memberName,
        input.memberIdentityNo ?? null,
        input.workSummary,
        input.progressStatus
      ]
    );
    return mapReportMemberWorkRow(result.rows[0]);
  }

  async listReportMemberWork(reportId: string): Promise<ProjectReportMemberWork[]> {
    const result = await this.pool.query(
      `SELECT * FROM projects.project_report_member_work WHERE report_id = $1 ORDER BY created_at ASC`,
      [reportId]
    );
    return result.rows.map(mapReportMemberWorkRow);
  }
}

function mapProjectRow(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    ownerUserId: String(row.owner_user_id ?? row.owner_id),
    ownerName: String(row.owner_name),
    ownerIdentityNo: String(row.owner_identity_no ?? row.owner_id ?? ""),
    advisorUserId: row.advisor_user_id ? String(row.advisor_user_id) : undefined,
    advisorName: row.advisor_name ? String(row.advisor_name) : undefined,
    advisorIdentityNo: row.advisor_identity_no ? String(row.advisor_identity_no) : undefined,
    startsAt: row.starts_at ? new Date(String(row.starts_at)).toISOString() : undefined,
    endsAt: row.ends_at ? new Date(String(row.ends_at)).toISOString() : undefined,
    status: row.status as ProjectStatus,
    reportCycleDays: Number(row.report_cycle_days ?? 14),
    lastReportAt: row.last_report_at
      ? new Date(String(row.last_report_at)).toISOString()
      : undefined,
    nextReportDueAt: row.next_report_due_at
      ? new Date(String(row.next_report_due_at)).toISOString()
      : undefined,
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
    assigneeIdentityNo: row.assignee_identity_no ? String(row.assignee_identity_no) : undefined,
    creatorUserId: row.creator_user_id ? String(row.creator_user_id) : undefined,
    reviewerUserId: row.reviewer_user_id ? String(row.reviewer_user_id) : undefined,
    treeNodeId: row.tree_node_id ? String(row.tree_node_id) : undefined,
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

function mapMemberRow(row: Record<string, unknown>): ProjectMember {
  return {
    projectId: String(row.project_id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    identityType: row.identity_type as IdentityType,
    identityNo: String(row.identity_no),
    memberRole: row.member_role as MemberRole,
    joinedAt: new Date(String(row.joined_at)).toISOString()
  };
}

function mapProgressRow(row: Record<string, unknown>): ProgressReport {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    title: String(row.title),
    content: String(row.content),
    treeSnapshotId: row.tree_snapshot_id ? String(row.tree_snapshot_id) : undefined,
    summary: row.summary ? String(row.summary) : undefined,
    nextPlan: row.next_plan ? String(row.next_plan) : undefined,
    helpNeeded: row.help_needed ? String(row.help_needed) : undefined,
    status: row.status ? (String(row.status) as ProgressReport["status"]) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapTreeNodeRow(row: Record<string, unknown>): ProjectTreeNode {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    parentId: row.parent_id ? String(row.parent_id) : undefined,
    title: String(row.title),
    status: row.status as TreeNodeStatus,
    sortOrder: Number(row.sort_order ?? 0),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    ownerName: row.owner_name ? String(row.owner_name) : undefined,
    ownerIdentityNo: row.owner_identity_no ? String(row.owner_identity_no) : undefined,
    remark: row.remark ? String(row.remark) : undefined,
    deliverableNote: row.deliverable_note ? String(row.deliverable_note) : undefined,
    collapsed: Boolean(row.collapsed),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapTreeSnapshotNodeRow(row: Record<string, unknown>): ProjectTreeNode {
  return {
    id: String(row.node_id),
    projectId: String(row.project_id),
    parentId: row.parent_id ? String(row.parent_id) : undefined,
    title: String(row.title),
    status: row.status as TreeNodeStatus,
    sortOrder: Number(row.sort_order ?? 0),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    ownerName: row.owner_name ? String(row.owner_name) : undefined,
    ownerIdentityNo: row.owner_identity_no ? String(row.owner_identity_no) : undefined,
    remark: row.remark ? String(row.remark) : undefined,
    deliverableNote: row.deliverable_note ? String(row.deliverable_note) : undefined,
    collapsed: Boolean(row.collapsed),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function mapReportMemberWorkRow(row: Record<string, unknown>): ProjectReportMemberWork {
  return {
    id: String(row.id),
    reportId: String(row.report_id),
    userId: row.user_id ? String(row.user_id) : undefined,
    memberName: String(row.member_name),
    memberIdentityNo: row.member_identity_no ? String(row.member_identity_no) : undefined,
    workSummary: String(row.work_summary),
    progressStatus: row.progress_status as TreeNodeStatus,
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function createRepository(): ProjectRepository {
  if (!process.env.DATABASE_URL) {
    return new MemoryProjectRepository();
  }
  return new PostgresProjectRepository(process.env.DATABASE_URL);
}

function isPrivilegedRole(actor: Actor): boolean {
  return ["lab_admin", "admin", "super_admin"].includes(actor.role);
}

async function resolveUser(
  context: {
    auth: { listUsers?: (search?: string, includeInactive?: boolean) => Promise<ManagedUser[]> };
  },
  userId: string
): Promise<ManagedUser | null> {
  const users = await context.auth.listUsers?.("", true);
  return users?.find((user) => user.id === userId && user.active) ?? null;
}

async function resolveUserByIdentityNo(
  context: {
    auth: { listUsers?: (search?: string, includeInactive?: boolean) => Promise<ManagedUser[]> };
  },
  identityNo: string
): Promise<ManagedUser | null> {
  const users = await context.auth.listUsers?.("", true);
  const normalizedIdentityNo = identityNo.trim().toLowerCase();
  return (
    users?.find(
      (user) => user.active && user.identityNo.trim().toLowerCase() === normalizedIdentityNo
    ) ?? null
  );
}

async function resolveUserByIdentity(
  context: {
    auth: { listUsers?: (search?: string, includeInactive?: boolean) => Promise<ManagedUser[]> };
  },
  options: { userId?: string; identityNo?: string; userName?: string }
): Promise<ManagedUser | null> {
  const user =
    (options.userId ? await resolveUser(context, options.userId) : null) ??
    (options.identityNo ? await resolveUserByIdentityNo(context, options.identityNo) : null);
  if (!user) {
    return null;
  }
  if (options.userName && user.displayName.trim() !== options.userName.trim()) {
    return null;
  }
  return user;
}

function canSelfUpdateTask(actor: Actor, task: ProjectTask, member: ProjectMember | null): boolean {
  return actor.role === "student" && member !== null && task.assigneeId === actor.id;
}

function normalizeProjectMember(
  user: ManagedUser,
  projectId: string,
  memberRole: MemberRole
): ProjectMember {
  return {
    projectId,
    userId: user.id,
    userName: user.displayName,
    identityType: user.identityType,
    identityNo: user.identityNo,
    memberRole,
    joinedAt: new Date().toISOString()
  };
}

export const projectsPlugin: PluginManifest = {
  name: "projects",
  version: "0.1.0",
  description: "项目管理模块，支持学生负责人、导师、成员协作与任务管理",
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
    { method: "PATCH", path: "/projects/:id", summary: "更新项目" },
    {
      method: "GET",
      path: "/projects/:id/members",
      permission: "project:read",
      summary: "获取项目成员"
    },
    { method: "POST", path: "/projects/:id/members", summary: "添加项目成员" },
    { method: "PATCH", path: "/projects/:id/members/:userId", summary: "更新项目成员角色" },
    { method: "DELETE", path: "/projects/:id/members/:userId", summary: "移除项目成员" },
    {
      method: "GET",
      path: "/projects/:id/tree",
      permission: "project:read",
      summary: "获取项目树"
    },
    {
      method: "PUT",
      path: "/projects/:id/tree",
      permission: "project:read",
      summary: "保存项目树"
    },
    {
      method: "POST",
      path: "/projects/:id/tree/snapshot",
      permission: "project:read",
      summary: "创建项目树快照"
    },
    {
      method: "GET",
      path: "/projects/:id/tree/history",
      permission: "project:read",
      summary: "获取项目树快照历史"
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
      permission: "project:read",
      summary: "上传进度报告"
    },
    {
      method: "GET",
      path: "/projects/:id/reports",
      permission: "project:read",
      summary: "获取结构化汇报列表"
    },
    {
      method: "POST",
      path: "/projects/:id/reports",
      permission: "project:read",
      summary: "提交结构化汇报"
    },
    {
      method: "GET",
      path: "/projects/:id/reports/:reportId",
      permission: "project:read",
      summary: "获取汇报详情"
    },
    {
      method: "GET",
      path: "/projects/:id/tasks",
      permission: "project:read",
      summary: "获取项目任务列表"
    },
    { method: "POST", path: "/projects/:id/tasks", summary: "创建任务" },
    {
      method: "PATCH",
      path: "/projects/:id/tasks/:taskId",
      permission: "project:read",
      summary: "更新任务"
    },
    {
      method: "GET",
      path: "/projects/:id/tasks/:taskId/comments",
      permission: "project:read",
      summary: "获取任务评论"
    },
    { method: "POST", path: "/projects/:id/tasks/:taskId/comments", summary: "添加任务评论" }
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

    const ensureReadable = async (actor: Actor | null, projectId: string) => {
      if (!actor) {
        return { status: 401, body: { error: "Unauthorized" } } as const;
      }
      if (isPrivilegedRole(actor)) {
        return null;
      }
      const member = await repo.findMember(projectId, actor.id);
      return member ? null : ({ status: 403, body: { error: "无权访问该项目" } } as const);
    };

    const ensureManager = async (actor: Actor | null, projectId: string) => {
      if (!actor) {
        return { status: 401, body: { error: "Unauthorized" } } as const;
      }
      if (isPrivilegedRole(actor)) {
        return null;
      }
      const member = await repo.findMember(projectId, actor.id);
      if (!member || !["owner", "advisor"].includes(member.memberRole)) {
        return { status: 403, body: { error: "仅学生负责人、导师或管理员可修改项目" } } as const;
      }
      return null;
    };

    const ensureMemberManager = async (actor: Actor | null, projectId: string) => {
      if (!actor) {
        return { status: 401, body: { error: "Unauthorized" } } as const;
      }
      if (isPrivilegedRole(actor)) {
        return null;
      }
      const member = await repo.findMember(projectId, actor.id);
      if (!member || member.memberRole !== "advisor") {
        return { status: 403, body: { error: "仅导师或管理员可维护项目成员" } } as const;
      }
      return null;
    };

    const normalizeTreeRequests = (rawNodes: TreeNodeWriteRequest[]) => {
      const sanitized = rawNodes.map((rawNode, index) => {
        const title = rawNode.title?.trim();
        if (!title) {
          throw new Error("项目树节点标题不能为空");
        }
        return {
          id: rawNode.id ?? randomUUID(),
          parentId: rawNode.parentId ?? undefined,
          title,
          status: rawNode.status,
          sortOrder: rawNode.sortOrder ?? index + 1,
          ownerUserId: rawNode.ownerUserId,
          remark: rawNode.remark?.trim() ?? undefined,
          deliverableNote: rawNode.deliverableNote?.trim() ?? undefined,
          collapsed: rawNode.collapsed ?? false
        };
      });

      const byId = new Map<string, (typeof sanitized)[number]>();
      for (const node of sanitized) {
        if (byId.has(node.id)) {
          throw new Error(`项目树节点 ID 重复：${node.id}`);
        }
        byId.set(node.id, node);
      }

      for (const node of sanitized) {
        if (node.parentId && !byId.has(node.parentId)) {
          throw new Error(`节点“${node.title}”的父节点不存在`);
        }
        if (node.parentId && node.parentId === node.id) {
          throw new Error(`节点“${node.title}”不能把自己设为父节点`);
        }
      }

      for (const node of sanitized) {
        const visited = new Set<string>([node.id]);
        let currentParentId = node.parentId;
        while (currentParentId) {
          if (visited.has(currentParentId)) {
            throw new Error(`节点“${node.title}”存在循环层级，请调整后重试`);
          }
          visited.add(currentParentId);
          currentParentId = byId.get(currentParentId)?.parentId;
        }
      }

      const grouped = new Map<string, typeof sanitized>();
      for (const node of sanitized) {
        const key = node.parentId ?? "";
        const current = grouped.get(key) ?? [];
        current.push(node);
        grouped.set(key, current);
      }

      for (const siblings of grouped.values()) {
        siblings
          .sort((left, right) => {
            const gap = left.sortOrder - right.sortOrder;
            if (gap !== 0) {
              return gap;
            }
            return left.id.localeCompare(right.id);
          })
          .forEach((node, index) => {
            node.sortOrder = index + 1;
          });
      }

      return sanitized;
    };

    return {
      name: "projects",
      routes: [
        {
          method: "GET",
          path: "/projects",
          permission: "project:read",
          summary: "获取项目列表",
          handler: async ({ actor }) => {
            const all = await repo.listProjects();
            if (!actor || isPrivilegedRole(actor)) {
              return { body: all };
            }
            const memberIds = await repo.listMemberProjectIds(actor.id);
            return { body: all.filter((project) => memberIds.has(project.id)) };
          }
        },
        {
          method: "GET",
          path: "/projects/:id",
          permission: "project:read",
          summary: "获取项目详情",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            if (denied) {
              return denied;
            }
            const project = await repo.getProject(params.id);
            return project ? { body: project } : { status: 404, body: { error: "项目未找到" } };
          }
        },
        {
          method: "POST",
          path: "/projects",
          permission: "project:write",
          summary: "创建项目",
          handler: async ({ actor, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const req = body as Partial<ProjectCreateRequest>;
            if (!req.name?.trim()) {
              return { status: 400, body: { error: "项目名称不能为空" } };
            }
            if (!req.ownerIdentityNo?.trim() || !req.ownerName?.trim()) {
              return { status: 400, body: { error: "学生负责人必须提供姓名和学号" } };
            }
            const ownerUser = await resolveUserByIdentity(context, {
              userId: req.ownerUserId,
              identityNo: req.ownerIdentityNo,
              userName: req.ownerName
            });
            if (!ownerUser) {
              return { status: 400, body: { error: "必须指定存在的学生负责人" } };
            }
            if (ownerUser.role !== "student" || ownerUser.identityType !== "student_no") {
              return { status: 400, body: { error: "项目负责人必须是带学号的学生账号" } };
            }
            const advisorUser =
              req.advisorIdentityNo || req.advisorUserId
                ? await resolveUserByIdentity(context, {
                    userId: req.advisorUserId,
                    identityNo: req.advisorIdentityNo,
                    userName: req.advisorName
                  })
                : null;
            if (
              (req.advisorUserId || req.advisorIdentityNo) &&
              (!advisorUser || !["professor", "lab_admin"].includes(advisorUser.role))
            ) {
              return { status: 400, body: { error: "导师必须是教授或实验室管理员" } };
            }

            const project = await repo.createProject({
              name: req.name.trim(),
              description: req.description?.trim() ?? "",
              ownerUserId: ownerUser.id,
              ownerName: ownerUser.displayName,
              ownerIdentityNo: ownerUser.identityNo,
              advisorUserId: advisorUser?.id,
              advisorName: advisorUser?.displayName,
              advisorIdentityNo: advisorUser?.identityNo,
              startsAt: req.startsAt,
              endsAt: req.endsAt,
              status: "active",
              reportCycleDays: req.reportCycleDays ?? 14,
              lastReportAt: undefined,
              nextReportDueAt: undefined
            });

            await repo.upsertMember(normalizeProjectMember(ownerUser, project.id, "owner"));
            if (advisorUser) {
              await repo.upsertMember(normalizeProjectMember(advisorUser, project.id, "advisor"));
            }

            for (const memberInput of req.initialMembers ?? []) {
              const memberUser = await resolveUser(context, memberInput.userId);
              if (!memberUser) {
                continue;
              }
              const role = memberInput.memberRole ?? "member";
              await repo.upsertMember(normalizeProjectMember(memberUser, project.id, role));
            }

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
              metadata: { name: project.name, ownerUserId: ownerUser.id }
            });

            return { status: 201, body: project };
          }
        },
        {
          method: "PATCH",
          path: "/projects/:id",
          summary: "更新项目",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureManager(actor, params.id);
            if (denied) {
              return denied;
            }
            const req = body as Partial<ProjectUpdateRequest>;
            const updateInput: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">> = {};
            if (req.name !== undefined) updateInput.name = req.name.trim();
            if (req.description !== undefined) updateInput.description = req.description.trim();
            if (req.startsAt !== undefined) updateInput.startsAt = req.startsAt;
            if (req.endsAt !== undefined) updateInput.endsAt = req.endsAt;
            if (req.status !== undefined) updateInput.status = req.status;
            if (req.reportCycleDays !== undefined)
              updateInput.reportCycleDays = req.reportCycleDays;
            if (req.lastReportAt !== undefined)
              updateInput.lastReportAt = req.lastReportAt ?? undefined;
            if (req.nextReportDueAt !== undefined) {
              updateInput.nextReportDueAt = req.nextReportDueAt ?? undefined;
            }

            if (req.ownerUserId) {
              const ownerUser = await resolveUser(context, req.ownerUserId);
              if (
                !ownerUser ||
                ownerUser.role !== "student" ||
                ownerUser.identityType !== "student_no"
              ) {
                return { status: 400, body: { error: "项目负责人必须是带学号的学生账号" } };
              }
              updateInput.ownerUserId = ownerUser.id;
              updateInput.ownerName = ownerUser.displayName;
              updateInput.ownerIdentityNo = ownerUser.identityNo;
              await repo.upsertMember(normalizeProjectMember(ownerUser, params.id, "owner"));
            }
            if (req.advisorUserId !== undefined) {
              if (req.advisorUserId === null) {
                updateInput.advisorUserId = undefined;
                updateInput.advisorName = undefined;
                updateInput.advisorIdentityNo = undefined;
              } else {
                const advisorUser = await resolveUser(context, req.advisorUserId);
                if (!advisorUser || !["professor", "lab_admin"].includes(advisorUser.role)) {
                  return { status: 400, body: { error: "导师必须是教授或实验室管理员" } };
                }
                updateInput.advisorUserId = advisorUser.id;
                updateInput.advisorName = advisorUser.displayName;
                updateInput.advisorIdentityNo = advisorUser.identityNo;
                await repo.upsertMember(normalizeProjectMember(advisorUser, params.id, "advisor"));
              }
            }

            const project = await repo.updateProject(params.id, updateInput);
            if (!project) {
              return { status: 404, body: { error: "项目未找到" } };
            }

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.project.updated", { projectId: project.id })
            );
            await context.audit.record({
              actorId: actor!.id,
              action: "projects.project.updated",
              targetType: "project",
              targetId: project.id,
              occurredAt: new Date().toISOString()
            });

            return { body: project };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/members",
          permission: "project:read",
          summary: "获取项目成员",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            return denied ?? { body: await repo.listMembers(params.id) };
          }
        },
        {
          method: "POST",
          path: "/projects/:id/members",
          summary: "添加项目成员",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureMemberManager(actor, params.id);
            if (denied) {
              return denied;
            }
            const req = body as ProjectMemberWriteRequest;
            if (!req.identityNo?.trim() || !req.userName?.trim() || !req.memberRole) {
              return { status: 400, body: { error: "姓名、学号/工号和成员角色必填" } };
            }
            if (req.memberRole === "owner" || req.memberRole === "advisor") {
              return { status: 400, body: { error: "负责人和导师请通过项目主信息修改" } };
            }
            const user =
              (req.userId ? await resolveUser(context, req.userId) : null) ??
              (await resolveUserByIdentityNo(context, req.identityNo));
            if (!user || !user.identityNo) {
              return { status: 400, body: { error: "成员必须具备完整的姓名和学号/工号" } };
            }
            if (user.displayName.trim() !== req.userName.trim()) {
              return { status: 400, body: { error: "姓名与学号/工号不匹配，请确认后再添加" } };
            }
            await repo.upsertMember(normalizeProjectMember(user, params.id, req.memberRole));
            return { status: 201, body: await repo.listMembers(params.id) };
          }
        },
        {
          method: "PATCH",
          path: "/projects/:id/members/:userId",
          summary: "更新项目成员角色",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureMemberManager(actor, params.id);
            if (denied) {
              return denied;
            }
            const req = body as ProjectMemberWriteRequest;
            if (!req.memberRole) {
              return { status: 400, body: { error: "memberRole 必填" } };
            }
            const existing = await repo.findMember(params.id, params.userId);
            if (!existing) {
              return { status: 404, body: { error: "成员未找到" } };
            }
            if (["owner", "advisor"].includes(existing.memberRole)) {
              return { status: 400, body: { error: "负责人和导师角色请通过项目主信息修改" } };
            }
            await repo.upsertMember({ ...existing, memberRole: req.memberRole });
            return { body: await repo.listMembers(params.id) };
          }
        },
        {
          method: "DELETE",
          path: "/projects/:id/members/:userId",
          summary: "移除项目成员",
          handler: async ({ actor, params }) => {
            const denied = await ensureMemberManager(actor, params.id);
            if (denied) {
              return denied;
            }
            const existing = await repo.findMember(params.id, params.userId);
            if (!existing) {
              return { status: 404, body: { error: "成员未找到" } };
            }
            if (["owner", "advisor"].includes(existing.memberRole)) {
              return { status: 400, body: { error: "不能直接移除负责人或导师，请先更换角色" } };
            }
            await repo.removeMember(params.id, params.userId);
            return { body: { ok: true } };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/tree",
          permission: "project:read",
          summary: "获取项目树",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            return denied ?? { body: await repo.listProjectTree(params.id) };
          }
        },
        {
          method: "PUT",
          path: "/projects/:id/tree",
          permission: "project:read",
          summary: "保存项目树",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureManager(actor, params.id);
            if (denied) {
              return denied;
            }
            const payload = body as Partial<{ nodes: TreeNodeWriteRequest[] }>;
            let rawNodes: ReturnType<typeof normalizeTreeRequests>;
            try {
              rawNodes = normalizeTreeRequests(payload.nodes ?? []);
            } catch (error) {
              return {
                status: 400,
                body: {
                  error: error instanceof Error ? error.message : "项目树结构非法"
                }
              };
            }
            const nodes: ProjectTreeNode[] = [];
            for (const rawNode of rawNodes) {
              const owner = rawNode.ownerUserId
                ? await resolveUser(context, rawNode.ownerUserId)
                : null;
              nodes.push({
                id: rawNode.id,
                projectId: params.id,
                parentId: rawNode.parentId ?? undefined,
                title: rawNode.title,
                status: rawNode.status,
                sortOrder: rawNode.sortOrder,
                ownerUserId: owner?.id,
                ownerName: owner?.displayName,
                ownerIdentityNo: owner?.identityNo,
                remark: rawNode.remark,
                deliverableNote: rawNode.deliverableNote,
                collapsed: rawNode.collapsed,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
            return { body: await repo.saveProjectTree(params.id, nodes) };
          }
        },
        {
          method: "POST",
          path: "/projects/:id/tree/snapshot",
          permission: "project:read",
          summary: "创建项目树快照",
          handler: async ({ actor, params }) => {
            const denied = await ensureManager(actor, params.id);
            if (denied) {
              return denied;
            }
            const snapshot = await repo.createTreeSnapshot(
              params.id,
              actor!.id,
              actor!.displayName ?? actor!.username ?? actor!.id
            );
            return { status: 201, body: snapshot };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/tree/history",
          permission: "project:read",
          summary: "获取项目树快照历史",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            return denied ?? { body: await repo.listTreeSnapshots(params.id) };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/progress",
          permission: "project:read",
          summary: "获取进度报告",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            return denied ?? { body: await repo.listProgress(params.id) };
          }
        },
        {
          method: "POST",
          path: "/projects/:id/progress",
          permission: "project:read",
          summary: "上传进度报告",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureReadable(actor, params.id);
            if (denied) {
              return denied;
            }
            const req = body as CreateProgressRequest;
            if (!req.title?.trim()) {
              return { status: 400, body: { error: "title required" } };
            }
            const snapshot = await repo.createTreeSnapshot(
              params.id,
              actor!.id,
              actor!.displayName ?? actor!.username ?? ""
            );
            const report = await repo.createProgress(
              params.id,
              actor!.id,
              actor!.displayName ?? actor!.username ?? "",
              {
                title: req.title.trim(),
                content: req.content?.trim() ?? "",
                treeSnapshotId: snapshot.id,
                summary: req.summary?.trim() ?? req.content?.trim() ?? "",
                nextPlan: req.nextPlan?.trim() ?? "",
                helpNeeded: req.helpNeeded?.trim() ?? "",
                status: "submitted"
              }
            );
            for (const memberWork of req.memberWork ?? []) {
              await repo.createReportMemberWork({
                reportId: report.id,
                userId: memberWork.userId,
                memberName: memberWork.memberName,
                memberIdentityNo: memberWork.memberIdentityNo,
                workSummary: memberWork.workSummary,
                progressStatus: memberWork.progressStatus
              });
            }
            return { status: 201, body: report };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/reports",
          permission: "project:read",
          summary: "获取结构化汇报列表",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            return denied ?? { body: await repo.listProgress(params.id) };
          }
        },
        {
          method: "POST",
          path: "/projects/:id/reports",
          permission: "project:read",
          summary: "提交结构化汇报",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureReadable(actor, params.id);
            if (denied) {
              return denied;
            }
            const req = body as ReportUpdateRequest;
            if (!req.title?.trim()) {
              return { status: 400, body: { error: "title required" } };
            }
            const snapshot = await repo.createTreeSnapshot(
              params.id,
              actor!.id,
              actor!.displayName ?? actor!.username ?? ""
            );
            const report = await repo.createProgress(
              params.id,
              actor!.id,
              actor!.displayName ?? "",
              {
                title: req.title.trim(),
                content: req.content?.trim() ?? "",
                treeSnapshotId: snapshot.id,
                summary: req.summary?.trim() ?? "",
                nextPlan: req.nextPlan?.trim() ?? "",
                helpNeeded: req.helpNeeded?.trim() ?? "",
                status: req.status ?? "submitted"
              }
            );
            for (const memberWork of req.memberWork ?? []) {
              await repo.createReportMemberWork({
                reportId: report.id,
                userId: memberWork.userId,
                memberName: memberWork.memberName,
                memberIdentityNo: memberWork.memberIdentityNo,
                workSummary: memberWork.workSummary,
                progressStatus: memberWork.progressStatus
              });
            }
            return { status: 201, body: report };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/reports/:reportId",
          permission: "project:read",
          summary: "获取汇报详情",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            if (denied) {
              return denied;
            }
            const reports = await repo.listProgress(params.id);
            const report = reports.find((item) => item.id === params.reportId);
            if (!report) {
              return { status: 404, body: { error: "汇报未找到" } };
            }
            const treeSnapshot = report.treeSnapshotId
              ? await repo.getTreeSnapshot(params.id, report.treeSnapshotId)
              : null;
            return {
              body: {
                ...report,
                memberWork: await repo.listReportMemberWork(report.id),
                treeSnapshot: treeSnapshot ?? undefined
              } as ProjectReportDetail
            };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/tasks",
          permission: "project:read",
          summary: "获取项目任务列表",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            return denied ?? { body: await repo.listTasks(params.id) };
          }
        },
        {
          method: "POST",
          path: "/projects/:id/tasks",
          summary: "创建任务",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureManager(actor, params.id);
            if (denied) {
              return denied;
            }
            const req = body as Partial<TaskCreateRequest>;
            if (!req.title?.trim()) {
              return { status: 400, body: { error: "任务标题不能为空" } };
            }
            const assigneeMember = req.assigneeId
              ? await repo.findMember(params.id, req.assigneeId)
              : null;
            if (req.assigneeId && !assigneeMember) {
              return { status: 400, body: { error: "任务负责人必须来自项目成员列表" } };
            }
            const task = await repo.createTask({
              projectId: params.id,
              title: req.title.trim(),
              description: req.description?.trim() ?? "",
              assigneeId: assigneeMember?.userId,
              assigneeName: assigneeMember?.userName,
              assigneeIdentityNo: assigneeMember?.identityNo,
              creatorUserId: actor!.id,
              reviewerUserId: req.reviewerUserId ?? undefined,
              treeNodeId: undefined,
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
            return { status: 201, body: task };
          }
        },
        {
          method: "PATCH",
          path: "/projects/:id/tasks/:taskId",
          permission: "project:read",
          summary: "更新任务",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureReadable(actor, params.id);
            if (denied) {
              return denied;
            }
            const task = await repo.getTask(params.taskId);
            if (!task || task.projectId !== params.id) {
              return { status: 404, body: { error: "任务未找到" } };
            }
            const member = actor ? await repo.findMember(params.id, actor.id) : null;
            const isManager = actor
              ? isPrivilegedRole(actor) || ["owner", "advisor"].includes(member?.memberRole ?? "")
              : false;

            const req = body as Partial<TaskUpdateRequest>;
            let updateInput: Partial<Omit<ProjectTask, "id" | "createdAt" | "updatedAt">>;

            if (actor && canSelfUpdateTask(actor, task, member)) {
              const allowedStatuses: TaskStatus[] = ["in_progress", "done"];
              if (!req.status || !allowedStatuses.includes(req.status)) {
                return { status: 403, body: { error: "学生仅可更新自己任务状态为进行中或完成" } };
              }
              updateInput = { status: req.status };
            } else if (isManager) {
              const assigneeMember = req.assigneeId
                ? await repo.findMember(params.id, req.assigneeId)
                : null;
              if (req.assigneeId && !assigneeMember) {
                return { status: 400, body: { error: "任务负责人必须来自项目成员列表" } };
              }
              updateInput = {
                title: req.title?.trim(),
                description: req.description?.trim(),
                assigneeId: assigneeMember?.userId,
                assigneeName: assigneeMember?.userName,
                assigneeIdentityNo: assigneeMember?.identityNo,
                reviewerUserId: req.reviewerUserId ?? undefined,
                priority: req.priority,
                status: req.status,
                dueDate: req.dueDate ?? undefined
              };
            } else {
              return { status: 403, body: { error: "无权修改该任务" } };
            }

            const updated = await repo.updateTask(params.taskId, updateInput);
            if (!updated) {
              return { status: 404, body: { error: "任务未找到" } };
            }

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.task.updated", {
                taskId: updated.id,
                projectId: params.id,
                status: updated.status
              })
            );
            return { body: updated };
          }
        },
        {
          method: "GET",
          path: "/projects/:id/tasks/:taskId/comments",
          permission: "project:read",
          summary: "获取任务评论",
          handler: async ({ actor, params }) => {
            const denied = await ensureReadable(actor, params.id);
            return denied ?? { body: await repo.listComments(params.taskId) };
          }
        },
        {
          method: "POST",
          path: "/projects/:id/tasks/:taskId/comments",
          summary: "添加任务评论",
          handler: async ({ actor, params, body }) => {
            const denied = await ensureReadable(actor, params.id);
            if (denied) {
              return denied;
            }
            const req = body as CommentCreateRequest;
            if (!req.content?.trim()) {
              return { status: 400, body: { error: "评论内容不能为空" } };
            }
            const comment = await repo.createComment({
              taskId: params.taskId,
              authorId: actor!.id,
              authorName: actor!.displayName ?? actor!.username ?? actor!.id,
              content: req.content.trim()
            });

            await context.eventBus.publish(
              createDomainEvent("projects", "projects.task.comment.added", {
                taskId: params.taskId,
                commentId: comment.id
              })
            );
            return { status: 201, body: comment };
          }
        }
      ]
    };
  }
};
