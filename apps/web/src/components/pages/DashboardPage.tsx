import { EmptyState, StatusBadge } from "../shared/Ui";
import type {
  Actor,
  DashboardSnapshot,
  InventoryApplication,
  Material,
  NotificationItem,
  Project,
  ProjectTask,
  Summary
} from "../../types";

interface DashboardPageProps {
  actor: Actor;
  actorName: string;
  summary: Summary;
  projects: Project[];
  tasks: ProjectTask[];
  materials: Material[];
  applications: InventoryApplication[];
  notifications: NotificationItem[];
  dashboard: DashboardSnapshot | null;
  onOpenView: (view: "projects" | "inventory" | "files" | "meetings" | "ai") => void;
  onSelectProject: (projectId: string) => void;
}

function projectState(status: Project["status"]) {
  return status === "completed" ? "已完成" : status === "pending" ? "待审批" : "进行中";
}

export function DashboardPage({
  actor,
  actorName,
  summary,
  projects,
  tasks,
  materials,
  applications,
  notifications,
  dashboard,
  onOpenView,
  onSelectProject
}: DashboardPageProps) {
  const activeProjects = projects.filter((project) => project.status === "active");
  const pendingApplications = applications.filter((item) => item.status === "pending");
  const lowStock = materials.filter((material) => material.stock <= material.warnStock);
  const recentTasks = [...tasks]
    .sort((left, right) => +new Date(right.updatedAt) - +new Date(left.updatedAt))
    .slice(0, 6);
  const recentNotices = [...notifications]
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))
    .slice(0, 4);
  const canApprove = actor.permissions.includes("inventory:approve") || actor.role !== "student";

  return (
    <div className="command-page-grid">
      <header className="command-page-header">
        <div>
          <span className="command-kicker">
            TODAY / {actor.role === "student" ? "MEMBER" : "CONTROL"}
          </span>
          <h1>{actorName}，今天先处理这些</h1>
          <p>待办、项目变化和需要你确认的事项集中在这里。</p>
        </div>
        <div className="command-page-actions">
          <button type="button" className="command-primary" onClick={() => onOpenView("projects")}>
            查看项目
          </button>
          <button
            type="button"
            className="command-secondary"
            onClick={() => onOpenView("inventory")}
          >
            {canApprove ? "处理审批" : "申请物资"}
          </button>
        </div>
      </header>

      <div className="command-metric-row">
        <div>
          <span>进行中项目</span>
          <strong>{dashboard?.activeProjectCount ?? activeProjects.length}</strong>
          <small>当前可见范围</small>
        </div>
        <div>
          <span>我的待办</span>
          <strong>{recentTasks.filter((task) => task.status !== "done").length}</strong>
          <small>按更新时间排序</small>
        </div>
        <div>
          <span>待审批</span>
          <strong>{summary.pendingApplications}</strong>
          <small>物资申请</small>
        </div>
        <div>
          <span>低库存</span>
          <strong className={lowStock.length ? "metric-warning" : ""}>
            {summary.lowStockCount}
          </strong>
          <small>需要补货</small>
        </div>
      </div>

      <div className="command-workspace-grid">
        <section className="command-list-panel">
          <div className="command-panel-head">
            <div>
              <span className="command-kicker">MY QUEUE</span>
              <h2>我的工作</h2>
            </div>
            <button type="button" onClick={() => onOpenView("projects")}>
              查看全部 →
            </button>
          </div>
          <div className="command-tabs">
            <span className="active">全部</span>
            <span>待处理</span>
            <span>已完成</span>
          </div>
          {recentTasks.length === 0 ? (
            <EmptyState title="还没有任务" text="进入项目后，负责人可以给你分配任务。" />
          ) : (
            <div className="command-task-list">
              {recentTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="command-task-row"
                  onClick={() => onSelectProject(task.projectId)}
                >
                  <span className={`task-marker ${task.status}`} />
                  <span className="task-copy">
                    <strong>{task.title}</strong>
                    <small>
                      {task.projectName ?? "未关联项目"} · {task.assigneeName ?? "待指派"}
                    </small>
                  </span>
                  <StatusBadge
                    tone={
                      task.status === "done"
                        ? "muted"
                        : task.status === "review"
                          ? "pending"
                          : "active"
                    }
                  >
                    {task.status === "done"
                      ? "完成"
                      : task.status === "review"
                        ? "待评审"
                        : task.status === "in_progress"
                          ? "进行中"
                          : "待开始"}
                  </StatusBadge>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="command-list-panel">
          <div className="command-panel-head">
            <div>
              <span className="command-kicker">PROJECTS</span>
              <h2>项目动态</h2>
            </div>
            <button type="button" onClick={() => onOpenView("projects")}>
              目录 →
            </button>
          </div>
          <div className="command-project-list">
            {projects.slice(0, 5).map((project) => (
              <button
                key={project.id}
                type="button"
                className="command-project-row"
                onClick={() => onSelectProject(project.id)}
              >
                <span className="project-initial">{project.name.slice(0, 1)}</span>
                <span>
                  <strong>{project.name}</strong>
                  <small>
                    {project.ownerName} ·{" "}
                    {project.endsAt
                      ? new Date(project.endsAt).toLocaleDateString("zh-CN")
                      : "周期未设定"}
                  </small>
                </span>
                <em>{projectState(project.status)}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="command-side-panel">
          <div className="command-panel-head">
            <div>
              <span className="command-kicker">ATTENTION</span>
              <h2>需要关注</h2>
            </div>
          </div>
          <div className="attention-list">
            <button type="button" onClick={() => onOpenView("inventory")}>
              <strong>{lowStock.length}</strong>
              <span>项物资低于预警线</span>
              <b>查看库存 →</b>
            </button>
            <button type="button" onClick={() => onOpenView("inventory")}>
              <strong>{pendingApplications.length}</strong>
              <span>条申请等待处理</span>
              <b>打开审批 →</b>
            </button>
            <button type="button" onClick={() => onOpenView("meetings")}>
              <strong>{notifications.length}</strong>
              <span>条会议与系统通知</span>
              <b>查看通知 →</b>
            </button>
          </div>
        </section>

        <section className="command-side-panel command-notice-panel">
          <div className="command-panel-head">
            <div>
              <span className="command-kicker">INBOX</span>
              <h2>最近通知</h2>
            </div>
            <button type="button" onClick={() => onOpenView("meetings")}>
              全部 →
            </button>
          </div>
          {recentNotices.length === 0 ? (
            <EmptyState title="暂无新通知" text="会议、审批和系统公告会出现在这里。" />
          ) : (
            recentNotices.map((notice) => (
              <article key={notice.id}>
                <strong>{notice.title}</strong>
                <p>{notice.content}</p>
                <small>
                  {new Date(notice.createdAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </small>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
