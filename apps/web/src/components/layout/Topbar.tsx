import { roleText } from "../../utils/helpers";
import type { Actor, Project } from "../../types";

interface TopbarProps {
  actor: Actor;
  projects: Project[];
  selectedProjectId: string;
  unreadCount: number;
  onSelectProject: (projectId: string) => void;
  onLogout: () => void;
}

export function Topbar({
  actor,
  projects,
  selectedProjectId,
  unreadCount,
  onSelectProject,
  onLogout
}: TopbarProps) {
  const activeProject = projects.find((project) => project.id === selectedProjectId);
  const now = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  return (
    <header className="topbar-shell">
      <div className="topbar-context">
        <div className="topbar-project-head">
          <span className="topbar-label">当前项目</span>
          <div className="select-wrap project-select-wrap">
            <select
              value={selectedProjectId}
              onChange={(event) => onSelectProject(event.target.value)}
            >
              <option value="">全部项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <span className="select-caret">▾</span>
          </div>
        </div>

        <div className="project-banner">
          <div className="project-banner-main">
            <strong>{activeProject?.name ?? "跨项目视图"}</strong>
            <span>
              {activeProject?.description?.trim() || "当前可在此快速切换课题、查看状态与负责人。"}
            </span>
          </div>
          <div className="project-banner-meta">
            <div className="project-state">
              <span className={`status-dot ${activeProject?.status ?? "active"}`} />
              {activeProject
                ? `${activeProject.status === "pending" ? "待审批" : activeProject.status === "completed" ? "已完成" : "进行中"}`
                : "全局视图"}
            </div>
            {activeProject ? (
              <div className="project-meta-chip">负责人 · {activeProject.ownerName}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="topbar-meta">
          <small>{now}</small>
          <button type="button" className="icon-chip">
            <span aria-hidden="true">◔</span>
            {unreadCount > 0 ? <b>{unreadCount}</b> : null}
          </button>
        </div>
        <div className="user-chip">
          <div className="avatar-orb">{actor.displayName.slice(0, 1)}</div>
          <div className="user-chip-copy">
            <strong>{actor.username}</strong>
            <span>{actor.role === "professor" ? "教授 / 项目负责人" : roleText(actor.role)}</span>
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={onLogout}>
          <span aria-hidden="true">↗</span>
          退出
        </button>
      </div>
    </header>
  );
}
