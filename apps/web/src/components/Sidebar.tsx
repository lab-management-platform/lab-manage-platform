import {
  Bot,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  PackageCheck,
  Users
} from "lucide-react";
import { roleText } from "../utils/helpers";
import type { Actor } from "../types";

interface SidebarProps {
  actor: Actor;
}

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles: string[]; // 哪些角色可见
}

export function Sidebar({ actor }: SidebarProps) {
  const role = actor.role;

  const navItems: NavItem[] = [
    { href: "#dashboard", icon: <LayoutDashboard size={18} />, label: "工作台", roles: ["lab_admin", "professor", "student"] },
    { href: "#inventory", icon: <Boxes size={18} />, label: "耗材设备", roles: ["lab_admin", "professor", "student"] },
    { href: "#applications", icon: <ClipboardList size={18} />, label: "申请审批", roles: ["lab_admin", "professor", "student"] },
    { href: "#projects-section", icon: <FileText size={18} />, label: "项目管理", roles: ["lab_admin", "professor", "student"] },
    { href: "#stock-movements", icon: <PackageCheck size={18} />, label: "库存流水", roles: ["lab_admin", "professor"] },
    { href: "#files", icon: <FileText size={18} />, label: "文件资料", roles: ["lab_admin", "professor", "student"] },
    { href: "#meetings", icon: <CalendarClock size={18} />, label: "会议通知", roles: ["lab_admin", "professor", "student"] },
    { href: "#members", icon: <Users size={18} />, label: "账户管理", roles: ["lab_admin"] },
    { href: "#ai", icon: <Bot size={18} />, label: "AI 助手", roles: ["lab_admin", "professor", "student"] },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <FlaskConical size={26} />
        <div>
          <strong>实验室管理平台</strong>
          <span>Lab Ops Console</span>
        </div>
      </div>

      <nav className="nav">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item, idx) => (
            <a key={item.href} className={idx === 0 ? "active" : ""} href={item.href}>
              {item.icon}
              {item.label}
            </a>
          ))}
      </nav>

      <div className="role-card">
        <span>当前用户</span>
        <strong>{actor.displayName}</strong>
        <small>
          {actor.username} · {roleText(actor.role)}
        </small>
      </div>
    </aside>
  );
}
