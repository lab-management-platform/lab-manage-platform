import type { AppView } from "../../config/navigation";
import type { Actor, Project } from "../../types";

interface TopbarProps {
  actor: Actor;
  projects: Project[];
  selectedProjectId: string;
  unreadCount: number;
  onSelectProject: (projectId: string) => void;
  onOpenView: (view: AppView) => void;
  onLogout: () => void;
}

export function Topbar({
  actor,
  projects,
  selectedProjectId,
  unreadCount,
  onSelectProject,
  onOpenView,
  onLogout
}: TopbarProps) {
  const activeProject = projects.find((project) => project.id === selectedProjectId);
  return (
    <header className="command-topbar">
      <div className="command-breadcrumb">
        <span>实验室运营</span>
        <b>/</b>
        <strong>{activeProject?.name ?? "全局视图"}</strong>
      </div>
      <label className="command-search">
        <span aria-hidden="true">⌕</span>
        <input placeholder="搜索项目、成员、物资或资料" />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="command-topbar-actions">
        <button type="button" className="topbar-create" onClick={() => onOpenView("inventory")}>
          <b>+</b> 新建
        </button>
        <button
          type="button"
          className="topbar-notification"
          onClick={() => onOpenView("meetings")}
          aria-label="通知"
        >
          ◌{unreadCount > 0 ? <b>{unreadCount}</b> : null}
        </button>
        <select
          className="topbar-project-select"
          value={selectedProjectId}
          onChange={(event) => onSelectProject(event.target.value)}
          aria-label="切换项目"
        >
          <option value="">全部项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <button type="button" className="topbar-user" onClick={() => onOpenView("accounts")}>
          <span>{actor.displayName.slice(0, 1)}</span>
          <strong>{actor.username}</strong>
        </button>
        <button type="button" className="topbar-logout" onClick={onLogout}>
          退出
        </button>
      </div>
    </header>
  );
}
