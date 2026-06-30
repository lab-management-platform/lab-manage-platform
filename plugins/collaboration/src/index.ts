import type { Actor, PluginManifest } from "@lab/core";
import { randomUUID } from "node:crypto";
import pg from "pg";

type MeetingStatus = "scheduled" | "completed" | "cancelled";
type NotificationType = "announcement" | "meeting" | "approval" | "task" | "system";

interface Meeting {
  id: string;
  projectId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  onlineUrl?: string;
  participantIds: string[];
  agendaFileId?: string;
  minutesFileId?: string;
  summary: string;
  status: MeetingStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  recipientId?: string;
  title: string;
  content: string;
  type: NotificationType;
  relatedType?: string;
  relatedId?: string;
  readAt?: string;
  createdBy: string;
  createdAt: string;
}

interface NotificationReadReceipt {
  notificationId: string;
  actorId: string;
  readAt: string;
}

interface MeetingCreateRequest {
  projectId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  onlineUrl?: string;
  participantIds?: string[];
  agendaFileId?: string;
  summary?: string;
}

interface MeetingMinutesRequest {
  minutesFileId?: string;
  summary?: string;
  status?: MeetingStatus;
}

interface AnnouncementRequest {
  title: string;
  content: string;
  recipientIds?: string[];
  projectId?: string;
}

interface CollaborationRepository {
  initialize(): Promise<void>;
  listMeetings(actor: Actor): Promise<Meeting[]>;
  createMeeting(input: Omit<Meeting, "id" | "createdAt" | "updatedAt">): Promise<Meeting>;
  listProjectRecipientIds(projectId: string): Promise<string[]>;
  updateMeetingMinutes(
    meetingId: string,
    input: MeetingMinutesRequest & { actorId: string }
  ): Promise<Meeting>;
  listNotifications(actor: Actor, unreadOnly?: boolean): Promise<Notification[]>;
  createNotifications(
    input: Omit<Notification, "id" | "createdAt" | "readAt">[]
  ): Promise<Notification[]>;
  markNotificationRead(notificationId: string, actor: Actor): Promise<Notification | null>;
}

const seedMeetings: Meeting[] = [
  {
    id: "meet-001",
    projectId: "p-001",
    title: "平台需求评审会",
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString(),
    location: "实验室会议室",
    onlineUrl: "https://meeting.tencent.com/example",
    participantIds: ["u-admin", "u-student001"],
    summary: "评审账号、耗材、文件、会议与通知模块范围。",
    status: "scheduled",
    createdBy: "u-admin",
    createdByName: "实验室管理员",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const seedNotifications: Notification[] = [
  {
    id: "notice-001",
    title: "欢迎使用实验室管理平台",
    content: "请先完善个人联系方式，耗材申请和会议通知会在站内消息中提醒。",
    type: "announcement",
    createdBy: "u-admin",
    createdAt: new Date().toISOString()
  }
];

class MemoryCollaborationRepository implements CollaborationRepository {
  private readonly meetings = structuredClone(seedMeetings);
  private readonly notifications = structuredClone(seedNotifications);
  private readonly readReceipts: NotificationReadReceipt[] = [];

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async listMeetings(actor: Actor): Promise<Meeting[]> {
    return this.meetings
      .filter(
        (meeting) =>
          actor.permissions.includes("meeting:write") ||
          meeting.createdBy === actor.id ||
          meeting.participantIds.includes(actor.id)
      )
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }

  async createMeeting(input: Omit<Meeting, "id" | "createdAt" | "updatedAt">): Promise<Meeting> {
    const now = new Date().toISOString();
    const meeting = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.meetings.unshift(meeting);
    return meeting;
  }

  async listProjectRecipientIds(_projectId: string): Promise<string[]> {
    return ["u-admin", "u-student001"];
  }

  async updateMeetingMinutes(
    meetingId: string,
    input: MeetingMinutesRequest & { actorId: string }
  ): Promise<Meeting> {
    const meeting = this.meetings.find((item) => item.id === meetingId);
    if (!meeting) {
      throw new Error("meeting not found");
    }
    meeting.minutesFileId = input.minutesFileId ?? meeting.minutesFileId;
    meeting.summary = input.summary ?? meeting.summary;
    meeting.status = input.status ?? meeting.status;
    meeting.updatedAt = new Date().toISOString();
    void input.actorId;
    return meeting;
  }

  async listNotifications(actor: Actor, unreadOnly = false): Promise<Notification[]> {
    return this.notifications
      .filter((notification) => !notification.recipientId || notification.recipientId === actor.id)
      .filter(
        (notification) =>
          !(
            notification.createdBy === actor.id &&
            ["meeting", "announcement"].includes(notification.type)
          )
      )
      .map((notification) => ({
        ...notification,
        readAt: this.readReceipts.find(
          (receipt) => receipt.notificationId === notification.id && receipt.actorId === actor.id
        )?.readAt
      }))
      .filter((notification) => !unreadOnly || !notification.readAt)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async createNotifications(
    input: Omit<Notification, "id" | "createdAt" | "readAt">[]
  ): Promise<Notification[]> {
    const created = input.map((notification) => ({
      ...notification,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    }));
    this.notifications.unshift(...created);
    return created;
  }

  async markNotificationRead(notificationId: string, actor: Actor): Promise<Notification | null> {
    const notification = this.notifications.find(
      (item) => item.id === notificationId && (!item.recipientId || item.recipientId === actor.id)
    );
    if (!notification) {
      return null;
    }
    const existing = this.readReceipts.find(
      (receipt) => receipt.notificationId === notificationId && receipt.actorId === actor.id
    );
    const readAt = existing?.readAt ?? new Date().toISOString();
    if (!existing) {
      this.readReceipts.push({ notificationId, actorId: actor.id, readAt });
    }
    return { ...notification, readAt };
  }
}

class PostgresCollaborationRepository implements CollaborationRepository {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS collaboration;

      CREATE TABLE IF NOT EXISTS collaboration.meeting (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        location TEXT NOT NULL,
        online_url TEXT,
        participant_ids TEXT[] NOT NULL DEFAULT '{}',
        agenda_file_id TEXT,
        minutes_file_id TEXT,
        summary TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
        created_by TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE collaboration.meeting ADD COLUMN IF NOT EXISTS project_id TEXT;

      CREATE TABLE IF NOT EXISTS collaboration.notification (
        id TEXT PRIMARY KEY,
        recipient_id TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('announcement', 'meeting', 'approval', 'task', 'system')),
        related_type TEXT,
        related_id TEXT,
        read_at TIMESTAMPTZ,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE collaboration.notification ADD COLUMN IF NOT EXISTS project_id TEXT;

      CREATE TABLE IF NOT EXISTS collaboration.notification_read (
        notification_id TEXT NOT NULL REFERENCES collaboration.notification(id) ON DELETE CASCADE,
        actor_id TEXT NOT NULL,
        read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (notification_id, actor_id)
      );

      CREATE INDEX IF NOT EXISTS meeting_starts_at_idx ON collaboration.meeting(starts_at);
      CREATE INDEX IF NOT EXISTS notification_recipient_idx
        ON collaboration.notification(recipient_id, read_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS notification_read_actor_idx
        ON collaboration.notification_read(actor_id, read_at DESC);
    `);

    const count = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM collaboration.meeting"
    );
    if (Number(count.rows[0]?.count ?? 0) === 0) {
      for (const meeting of seedMeetings) {
        await this.pool.query(
          `INSERT INTO collaboration.meeting
            (id, project_id, title, starts_at, ends_at, location, online_url, participant_ids,
             agenda_file_id, minutes_file_id, summary, status, created_by, created_by_name,
             created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            meeting.id,
            meeting.projectId ?? null,
            meeting.title,
            meeting.startsAt,
            meeting.endsAt,
            meeting.location,
            meeting.onlineUrl ?? null,
            meeting.participantIds,
            meeting.agendaFileId ?? null,
            meeting.minutesFileId ?? null,
            meeting.summary,
            meeting.status,
            meeting.createdBy,
            meeting.createdByName,
            meeting.createdAt,
            meeting.updatedAt
          ]
        );
      }
      await this.createNotifications(seedNotifications);
    }
  }

  async listMeetings(actor: Actor): Promise<Meeting[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM collaboration.meeting
       WHERE $2 = true OR created_by = $1 OR $1 = ANY(participant_ids)
       ORDER BY starts_at ASC
       LIMIT 200`,
      [actor.id, actor.permissions.includes("meeting:write")]
    );
    return result.rows.map(mapMeetingRow);
  }

  async createMeeting(input: Omit<Meeting, "id" | "createdAt" | "updatedAt">): Promise<Meeting> {
    const result = await this.pool.query(
      `INSERT INTO collaboration.meeting
        (id, project_id, title, starts_at, ends_at, location, online_url, participant_ids,
         agenda_file_id, minutes_file_id, summary, status, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        randomUUID(),
        input.projectId ?? null,
        input.title,
        input.startsAt,
        input.endsAt,
        input.location,
        input.onlineUrl ?? null,
        input.participantIds,
        input.agendaFileId ?? null,
        input.minutesFileId ?? null,
        input.summary,
        input.status,
        input.createdBy,
        input.createdByName
      ]
    );
    return mapMeetingRow(result.rows[0]);
  }

  async listProjectRecipientIds(projectId: string): Promise<string[]> {
    const result = await this.pool.query<{ user_id: string }>(
      `SELECT DISTINCT user_id
       FROM projects.project_member
       WHERE project_id = $1
       UNION
       SELECT owner_user_id AS user_id
       FROM projects.project
       WHERE id = $1 AND owner_user_id IS NOT NULL
       UNION
       SELECT advisor_user_id AS user_id
       FROM projects.project
       WHERE id = $1 AND advisor_user_id IS NOT NULL`,
      [projectId]
    );
    return result.rows.map((row) => String(row.user_id)).filter(Boolean);
  }

  async updateMeetingMinutes(
    meetingId: string,
    input: MeetingMinutesRequest & { actorId: string }
  ): Promise<Meeting> {
    const result = await this.pool.query(
      `UPDATE collaboration.meeting
       SET minutes_file_id = COALESCE($2, minutes_file_id),
           summary = COALESCE($3, summary),
           status = COALESCE($4, status),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [meetingId, input.minutesFileId ?? null, input.summary ?? null, input.status ?? null]
    );
    const meeting = result.rows[0];
    if (!meeting) {
      throw new Error("meeting not found");
    }
    return mapMeetingRow(meeting);
  }

  async listNotifications(actor: Actor, unreadOnly = false): Promise<Notification[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM (
         SELECT
           n.id,
           n.recipient_id,
           n.title,
           n.content,
           n.type,
           n.related_type,
           n.related_id,
           nr.read_at,
           n.created_by,
           n.created_at
         FROM collaboration.notification n
         LEFT JOIN collaboration.notification_read nr
           ON nr.notification_id = n.id
          AND nr.actor_id = $1
         WHERE (n.recipient_id IS NULL OR n.recipient_id = $1)
           AND NOT (n.created_by = $1 AND n.type IN ('meeting', 'announcement'))
       ) notifications
       WHERE ($2 = false OR read_at IS NULL)
       ORDER BY created_at DESC
       LIMIT 100`,
      [actor.id, unreadOnly]
    );
    return result.rows.map(mapNotificationRow);
  }

  async createNotifications(
    input: Omit<Notification, "id" | "createdAt" | "readAt">[]
  ): Promise<Notification[]> {
    const created: Notification[] = [];
    for (const notification of input) {
      const result = await this.pool.query(
        `INSERT INTO collaboration.notification
          (id, recipient_id, title, content, type, related_type, related_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          randomUUID(),
          notification.recipientId ?? null,
          notification.title,
          notification.content,
          notification.type,
          notification.relatedType ?? null,
          notification.relatedId ?? null,
          notification.createdBy
        ]
      );
      created.push(mapNotificationRow(result.rows[0]));
    }
    return created;
  }

  async markNotificationRead(notificationId: string, actor: Actor): Promise<Notification | null> {
    const visible = await this.pool.query(
      `SELECT *
       FROM collaboration.notification
       WHERE id = $1
         AND (recipient_id IS NULL OR recipient_id = $2)
         AND NOT (created_by = $2 AND type IN ('meeting', 'announcement'))`,
      [notificationId, actor.id]
    );
    if (!visible.rows[0]) {
      return null;
    }
    await this.pool.query(
      `INSERT INTO collaboration.notification_read (notification_id, actor_id, read_at)
       VALUES ($1, $2, now())
       ON CONFLICT (notification_id, actor_id)
       DO UPDATE SET read_at = collaboration.notification_read.read_at`,
      [notificationId, actor.id]
    );
    const result = await this.pool.query(
      `SELECT
         n.id,
         n.recipient_id,
         n.title,
         n.content,
         n.type,
         n.related_type,
         n.related_id,
         nr.read_at,
         n.created_by,
         n.created_at
       FROM collaboration.notification n
       LEFT JOIN collaboration.notification_read nr
         ON nr.notification_id = n.id
        AND nr.actor_id = $2
       WHERE n.id = $1`,
      [notificationId, actor.id]
    );
    return result.rows[0] ? mapNotificationRow(result.rows[0]) : null;
  }
}

function mapMeetingRow(row: Record<string, unknown>): Meeting {
  return {
    id: String(row.id),
    projectId: row.project_id ? String(row.project_id) : undefined,
    title: String(row.title),
    startsAt: new Date(String(row.starts_at)).toISOString(),
    endsAt: new Date(String(row.ends_at)).toISOString(),
    location: String(row.location),
    onlineUrl: row.online_url ? String(row.online_url) : undefined,
    participantIds: Array.isArray(row.participant_ids) ? row.participant_ids.map(String) : [],
    agendaFileId: row.agenda_file_id ? String(row.agenda_file_id) : undefined,
    minutesFileId: row.minutes_file_id ? String(row.minutes_file_id) : undefined,
    summary: String(row.summary),
    status: row.status as MeetingStatus,
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapNotificationRow(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    recipientId: row.recipient_id ? String(row.recipient_id) : undefined,
    title: String(row.title),
    content: String(row.content),
    type: row.type as NotificationType,
    relatedType: row.related_type ? String(row.related_type) : undefined,
    relatedId: row.related_id ? String(row.related_id) : undefined,
    readAt: row.read_at ? new Date(String(row.read_at)).toISOString() : undefined,
    createdBy: String(row.created_by),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function createRepository(): CollaborationRepository {
  if (!process.env.DATABASE_URL) {
    return new MemoryCollaborationRepository();
  }
  return new PostgresCollaborationRepository(process.env.DATABASE_URL);
}

function validateMeetingRequest(request: Partial<MeetingCreateRequest>): string | null {
  if (!request.title?.trim()) {
    return "title is required";
  }
  if (!request.startsAt || !request.endsAt) {
    return "startsAt and endsAt are required";
  }
  const startsAt = new Date(request.startsAt);
  const endsAt = new Date(request.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "startsAt and endsAt must be valid dates";
  }
  if (endsAt <= startsAt) {
    return "endsAt must be after startsAt";
  }
  if (!request.location?.trim() && !request.onlineUrl?.trim()) {
    return "location or onlineUrl is required";
  }
  if (request.onlineUrl) {
    try {
      const parsed = new URL(request.onlineUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "onlineUrl must be http or https";
      }
    } catch {
      return "onlineUrl must be a valid URL";
    }
  }
  return null;
}

function normalizeParticipants(actor: Actor, participantIds?: string[]): string[] {
  return [...new Set([actor.id, ...(participantIds ?? []).map((id) => id.trim()).filter(Boolean)])];
}

export const collaborationPlugin: PluginManifest = {
  name: "collaboration",
  version: "0.1.0",
  description: "会议、公告与站内通知模块",
  capabilities: ["meeting:booking", "meeting:minutes", "notification:inbox", "announcement"],
  routes: [
    { method: "GET", path: "/meetings", permission: "meeting:read", summary: "查询会议" },
    { method: "POST", path: "/meetings", permission: "meeting:write", summary: "创建会议" },
    {
      method: "PATCH",
      path: "/meetings/:id/minutes",
      permission: "meeting:write",
      summary: "上传会议纪要引用"
    },
    { method: "GET", path: "/notifications", permission: "meeting:read", summary: "查询通知" },
    {
      method: "PATCH",
      path: "/notifications/:id/read",
      permission: "meeting:read",
      summary: "标记通知已读"
    },
    {
      method: "POST",
      path: "/announcements",
      permission: "meeting:write",
      summary: "发布公告"
    }
  ],
  eventsPublished: ["meeting.created", "meeting.minutes.updated", "notification.created"],
  eventsSubscribed: [],
  async activate(context) {
    const repository = createRepository();
    await repository.initialize();

    async function publishNotifications(notifications: Notification[]) {
      for (const notification of notifications) {
        await context.eventBus.publish({
          id: randomUUID(),
          type: "notification.created",
          version: 1,
          occurredAt: notification.createdAt,
          source: "collaboration",
          payload: { notificationId: notification.id, recipientId: notification.recipientId }
        });
      }
    }

    return {
      name: "collaboration",
      routes: [
        {
          method: "GET",
          path: "/meetings",
          permission: "meeting:read",
          summary: "查询会议",
          handler: async ({ actor }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            return { body: await repository.listMeetings(actor) };
          }
        },
        {
          method: "POST",
          path: "/meetings",
          permission: "meeting:write",
          summary: "创建会议",
          handler: async ({ actor, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const request = body as Partial<MeetingCreateRequest>;
            const error = validateMeetingRequest(request);
            if (error) {
              return { status: 400, body: { error } };
            }

            const projectId = (request as Partial<{ projectId: string }>).projectId?.trim();
            const participantIds = projectId
              ? normalizeParticipants(actor, await repository.listProjectRecipientIds(projectId))
              : normalizeParticipants(actor, request.participantIds);
            const meeting = await repository.createMeeting({
              projectId,
              title: request.title!.trim(),
              startsAt: new Date(request.startsAt!).toISOString(),
              endsAt: new Date(request.endsAt!).toISOString(),
              location: request.location?.trim() || "线上会议",
              onlineUrl: request.onlineUrl?.trim(),
              participantIds,
              agendaFileId: request.agendaFileId?.trim(),
              summary: request.summary?.trim() || "未填写会议说明",
              status: "scheduled",
              createdBy: actor.id,
              createdByName: actor.displayName ?? actor.username ?? actor.id
            });

            const notificationRecipients = participantIds.filter(
              (participantId) => participantId !== actor.id
            );
            const notifications = await repository.createNotifications(
              notificationRecipients.map((recipientId) => ({
                recipientId,
                title: `会议邀请：${meeting.title}`,
                content: `${new Date(meeting.startsAt).toLocaleString()}，${meeting.location}`,
                type: "meeting",
                relatedType: "meeting",
                relatedId: meeting.id,
                createdBy: actor.id
              }))
            );
            await publishNotifications(notifications);

            await context.audit.record({
              actorId: actor.id,
              action: "meeting.created",
              targetType: "meeting",
              targetId: meeting.id,
              occurredAt: new Date().toISOString(),
              metadata: {
                title: meeting.title,
                participantCount: participantIds.length,
                notificationRecipientCount: notificationRecipients.length
              }
            });
            await context.eventBus.publish({
              id: randomUUID(),
              type: "meeting.created",
              version: 1,
              occurredAt: new Date().toISOString(),
              source: "collaboration",
              payload: { meetingId: meeting.id, title: meeting.title }
            });

            return { status: 201, body: meeting };
          }
        },
        {
          method: "PATCH",
          path: "/meetings/:id/minutes",
          permission: "meeting:write",
          summary: "上传会议纪要引用",
          handler: async ({ actor, params, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            try {
              const meeting = await repository.updateMeetingMinutes(params.id, {
                ...(body as MeetingMinutesRequest),
                actorId: actor.id
              });
              await context.audit.record({
                actorId: actor.id,
                action: "meeting.minutes.updated",
                targetType: "meeting",
                targetId: meeting.id,
                occurredAt: new Date().toISOString(),
                metadata: { status: meeting.status }
              });
              await context.eventBus.publish({
                id: randomUUID(),
                type: "meeting.minutes.updated",
                version: 1,
                occurredAt: new Date().toISOString(),
                source: "collaboration",
                payload: { meetingId: meeting.id }
              });
              return { body: meeting };
            } catch (error) {
              return {
                status: error instanceof Error && error.message.includes("not found") ? 404 : 400,
                body: { error: error instanceof Error ? error.message : "meeting update failed" }
              };
            }
          }
        },
        {
          method: "GET",
          path: "/notifications",
          permission: "meeting:read",
          summary: "查询通知",
          handler: async ({ actor, query }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const params = query as Partial<{ unreadOnly: string }>;
            return {
              body: await repository.listNotifications(actor, params.unreadOnly === "true")
            };
          }
        },
        {
          method: "PATCH",
          path: "/notifications/:id/read",
          permission: "meeting:read",
          summary: "标记通知已读",
          handler: async ({ actor, params }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const notification = await repository.markNotificationRead(params.id, actor);
            if (!notification) {
              return { status: 404, body: { error: "notification not found" } };
            }
            await context.eventBus.publish({
              id: randomUUID(),
              type: "notification.read",
              version: 1,
              occurredAt: new Date().toISOString(),
              source: "collaboration",
              payload: { notificationId: notification.id, actorId: actor.id }
            });
            return { body: notification };
          }
        },
        {
          method: "POST",
          path: "/announcements",
          permission: "meeting:write",
          summary: "发布公告",
          handler: async ({ actor, body }) => {
            if (!actor) {
              return { status: 401, body: { error: "Unauthorized" } };
            }
            const request = body as Partial<AnnouncementRequest>;
            if (!request.title?.trim() || !request.content?.trim()) {
              return { status: 400, body: { error: "title and content are required" } };
            }
            const projectId = request.projectId?.trim();
            const requestedRecipientIds =
              request.recipientIds?.map((id) => id.trim()).filter(Boolean) ?? [];
            const recipientIds = projectId
              ? (await repository.listProjectRecipientIds(projectId)).filter(
                  (id) => id !== actor.id
                )
              : requestedRecipientIds.length > 0
                ? requestedRecipientIds.filter((id) => id !== actor.id)
                : ((await context.auth.listUsers?.("", false)) ?? [])
                    .filter((user) => user.active && user.id !== actor.id)
                    .map((user) => user.id);
            const notifications = await repository.createNotifications(
              recipientIds.map((recipientId) => ({
                recipientId,
                title: request.title!.trim(),
                content: request.content!.trim(),
                type: "announcement",
                relatedType: "announcement",
                relatedId: undefined,
                createdBy: actor.id
              }))
            );
            await publishNotifications(notifications);
            await context.audit.record({
              actorId: actor.id,
              action: "announcement.created",
              targetType: "announcement",
              occurredAt: new Date().toISOString(),
              metadata: { title: request.title!.trim(), recipientCount: recipientIds.length }
            });
            return { status: 201, body: notifications };
          }
        }
      ]
    };
  }
};
