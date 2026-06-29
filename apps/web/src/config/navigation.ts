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
}

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "◫",
    roles: ["lab_admin", "professor", "student"]
  },
  {
    id: "projects",
    label: "项目管理",
    icon: "▣",
    roles: ["lab_admin", "professor", "student"],
    permission: "project:read"
  },
  {
    id: "inventory",
    label: "耗材管理",
    icon: "◩",
    roles: ["lab_admin", "professor", "student"],
    permission: "inventory:read"
  },
  {
    id: "files",
    label: "文件资料",
    icon: "☰",
    roles: ["lab_admin", "professor", "student"],
    permission: "file:read"
  },
  {
    id: "meetings",
    label: "会议通知",
    icon: "◌",
    roles: ["lab_admin", "professor", "student"],
    permission: "meeting:read"
  },
  {
    id: "ai",
    label: "AI 助手",
    icon: "✦",
    roles: ["lab_admin", "professor", "student"],
    permission: "ai:use"
  },
  {
    id: "accounts",
    label: "账户管理",
    icon: "◎",
    roles: ["lab_admin", "professor", "student"]
  }
];
