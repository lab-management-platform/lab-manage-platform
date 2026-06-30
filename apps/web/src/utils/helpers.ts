import type {
  ApplicationStatus,
  FileCategory,
  FileKind,
  FileVisibility,
  IdentityType,
  MeetingStatus,
  NotificationType,
  Permission,
  Role
} from "../types";

export const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
export const applicationPreviewLimit = 8;
export const accountPreviewLimit = 10;
export const defaultResetPassword = "Student@123456";
export const phonePattern = /^1[3-9]\d{9}$/;

export function toDatetimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function statusText(status: ApplicationStatus) {
  return (
    {
      pending: "待审批",
      approved: "已批准",
      rejected: "已拒绝"
    } satisfies Record<ApplicationStatus, string>
  )[status];
}

export function projectStatusText(status: "pending" | "active" | "archived" | "completed") {
  return (
    {
      pending: "待审批",
      active: "进行中",
      archived: "已归档",
      completed: "已完成"
    } as const
  )[status];
}

export function memberRoleText(role: "owner" | "leader" | "member" | "advisor" | "observer") {
  return (
    {
      owner: "学生负责人",
      leader: "组内负责人",
      member: "成员",
      advisor: "导师",
      observer: "观察者"
    } as const
  )[role];
}

export function roleText(role: Role): string {
  const map: Record<Role, string> = {
    student: "学生",
    professor: "教授",
    lab_admin: "实验室管理员",
    member: "普通成员",
    admin: "平台管理员",
    super_admin: "超级管理员"
  };
  return map[role];
}

export function identityTypeText(identityType: IdentityType): string {
  return identityType === "student_no" ? "学号" : "工号";
}

export function fileCategoryText(category: FileCategory): string {
  const map: Record<FileCategory, string> = {
    sop: "SOP",
    template: "模板",
    record: "记录",
    dataset: "数据集",
    meeting: "会议",
    other: "其他"
  };
  return map[category];
}

export function visibilityText(visibility: FileVisibility): string {
  const map: Record<FileVisibility, string> = {
    public: "公开",
    group: "课题组可见",
    private: "仅自己可见"
  };
  return map[visibility];
}

export function fileKindText(fileKind: FileKind) {
  return (
    {
      project_tree: "项目树",
      report_doc: "汇报文档",
      report_ppt: "汇报 PPT",
      experiment_record: "实验记录",
      design_doc: "设计文档",
      api_doc: "接口文档",
      code_snapshot: "代码快照",
      dataset: "数据集",
      model_weight: "模型权重",
      meeting_minutes: "会议纪要",
      other: "其他"
    } as const
  )[fileKind];
}

export function treeStatusText(status: "todo" | "doing" | "done") {
  return (
    {
      todo: "未开始",
      doing: "进行中",
      done: "已完成"
    } as const
  )[status];
}

export function meetingStatusText(status: MeetingStatus): string {
  const map: Record<MeetingStatus, string> = {
    scheduled: "已预约",
    completed: "已完成",
    cancelled: "已取消"
  };
  return map[status];
}

export function notificationTypeText(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    announcement: "公告",
    meeting: "会议",
    approval: "审批",
    task: "任务",
    system: "系统"
  };
  return map[type];
}

export function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) {
    return "-";
  }
  if (sizeBytes < 1024 * 1024) {
    return `${Math.ceil(sizeBytes / 1024)} KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export const permissionLabels: Record<Permission, string> = {
  "user:read": "查看用户",
  "user:write": "管理用户",
  "inventory:read": "查看库存",
  "inventory:apply": "申请领用",
  "inventory:approve": "审批申请",
  "inventory:stock": "入库登记",
  "file:read": "查看文件",
  "file:write": "管理文件",
  "project:read": "查看项目",
  "project:write": "管理项目",
  "project:progress": "上传进度",
  "meeting:read": "查看会议",
  "meeting:write": "管理会议",
  "ai:use": "使用 AI",
  "ai:manage": "管理知识库"
};

export const rolePermissions: Record<Role, Permission[]> = {
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
