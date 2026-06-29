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
    <aside className={`sidebar-shell ${mobileNavOpen ? "open" : ""}`}>
      <div className="brand-panel">
        <button className="mobile-nav-button" type="button" onClick={onToggleMobileNav}>
          <span aria-hidden="true">≡</span>
        </button>
        <div className="brand-mark">
          <span aria-hidden="true">◈</span>
        </div>
        <div className="brand-copy">
          <strong>实验室管理平台</strong>
          <span>LAB MANAGEMENT SYSTEM</span>
        </div>
      </div>

      <nav className="nav-list">
        {allowedItems.map((item) => {
          return (
            <button
              key={item.id}
              type="button"
              className={item.id === activeView ? "nav-item active" : "nav-item"}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-foot-label">当前身份</span>
        <strong>{actor.displayName}</strong>
        <small>
          {roleText(actor.role)} / {actor.username}
        </small>
      </div>
    </aside>
  );
}
