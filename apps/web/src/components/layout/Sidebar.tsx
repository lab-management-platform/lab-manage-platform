import { navItems, type AppView } from "../../config/navigation";
import { roleText } from "../../utils/helpers";
import type { Actor } from "../../types";

interface SidebarProps {
  actor: Actor;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onToggleMobileNav: () => void;
  mobileNavOpen: boolean;
}

export function Sidebar({
  actor,
  activeView,
  onNavigate,
  onToggleMobileNav,
  mobileNavOpen
}: SidebarProps) {
  const allowedItems = navItems.filter(
    (item) =>
      item.roles.includes(actor.role) &&
      (!item.permission || actor.permissions.includes(item.permission))
  );

  return (
    <>
      <button
        className="mobile-nav-trigger"
        type="button"
        onClick={onToggleMobileNav}
        aria-label="打开导航"
      >
        ☰
      </button>
      <aside className={`command-sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="command-rail">
          <div className="command-logo" aria-label="实验室管理平台">
            L
          </div>
          <div className="rail-stack">
            {allowedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === activeView ? "rail-button active" : "rail-button"}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>
          <div className="rail-avatar">{actor.displayName.slice(0, 1)}</div>
        </div>

        <div className="command-nav">
          <div className="command-nav-title">
            <span>LAB OPS</span>
            <small>实验室运营</small>
          </div>
          <div className="command-nav-context">
            <span>当前空间</span>
            <strong>{allowedItems.find((item) => item.id === activeView)?.label}</strong>
          </div>
          <nav className="command-nav-list">
            {allowedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === activeView ? "command-nav-item active" : "command-nav-item"}
                onClick={() => onNavigate(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.children?.[0] ?? "概览"}</small>
                <b>›</b>
              </button>
            ))}
          </nav>
          <div className="command-nav-footer">
            <span>当前账号</span>
            <strong>{actor.username}</strong>
            <small>{roleText(actor.role)}</small>
          </div>
        </div>
      </aside>
    </>
  );
}
