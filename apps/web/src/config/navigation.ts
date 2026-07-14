import type { Permission, Role } from "../types";

export type AppView =
  | "dashboard"
  | "projects"
  | "inventory"
  | "files"
  | "meetings"
  | "ai"
  | "accounts";

export interface NavItem {
  id: AppView;
  label: string;
  icon: string;
  roles: Role[];
  permission?: Permission;
  children?: string[];
}

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "◫",
    roles: ["lab_admin", "professor", "student"],
    children: ["我的概览", "我的待办", "通知中心", "快捷提交"]
  },
  {
    id: "projects",
    label: "项目管理",
    icon: "▣",
    roles: ["lab_admin", "professor", "student"],
    permission: "project:read",
    children: ["项目目录", "项目详情", "任务与项目树", "进度汇报", "成员与角色"]
  },
  {
    id: "inventory",
    label: "物资管理",
    icon: "◩",
    roles: ["lab_admin", "professor", "student"],
    permission: "inventory:read",
    children: ["物资目录", "我的申请", "审批中心", "库存台账", "器材借还", "逾期提醒"]
  },
  {
    id: "files",
    label: "文件资料",
    icon: "☰",
    roles: ["lab_admin", "professor", "student"],
    permission: "file:read",
    children: ["公共资料", "项目资料", "NAS 资料索引", "文件版本", "知识库"]
  },
  {
    id: "meetings",
    label: "会议通知",
    icon: "◌",
    roles: ["lab_admin", "professor", "student"],
    permission: "meeting:read",
    children: ["会议日历", "会议列表", "会议纪要", "通知收件箱"]
  },
  {
    id: "ai",
    label: "AI 助手",
    icon: "✦",
    roles: ["lab_admin", "professor", "student"],
    permission: "ai:use",
    children: ["对话工作台", "项目上下文", "引用来源", "对话历史"]
  },
  {
    id: "accounts",
    label: "账户管理",
    icon: "◎",
    roles: ["lab_admin", "professor", "student"],
    children: ["个人资料", "密码与安全"]
  }
];
