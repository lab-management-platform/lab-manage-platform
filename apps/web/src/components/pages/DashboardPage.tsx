import { SectionCard, StatCard, StatusBadge, EmptyState } from "../shared/Ui";
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
import type { AppView } from "../../config/navigation";

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
  onOpenView: (view: AppView) => void;
  onSelectProject: (projectId: string) => void;
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
  const lowStock = materials.filter((material) => material.stock <= material.warnStock).slice(0, 5);
  const pendingApplications = applications.filter((item) => item.status === "pending").slice(0, 4);
  const recentTasks = [...tasks]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4);
  const recentNotices = [...notifications]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);
  const roleLabel =
    actor.role === "professor" ? "教师视角" : actor.role === "lab_admin" ? "管理视角" : "成员视角";
  const canApprove =
    actor.permissions.includes("inventory:approve") ||
    actor.role === "professor" ||
    actor.role === "lab_admin";

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">实验室运营总览</p>
          <h1>欢迎回来，{actorName}</h1>
          <p className="hero-copy">
            项目、库存、通知和知识协作都集中在模块页里处理，不再通过长页面滚动查找入口。
          </p>
        </div>
        <div className="hero-stats">
          <StatCard
            title="待审批"
            value={summary.pendingApplications}
            hint="需要处理的领用申请"
            accent="gold"
          />
          <StatCard
            title="项目进行中"
            value={dashboard?.activeProjectCount ?? activeProjects.length}
            hint="由服务端聚合统计"
          />
          <StatCard
            title="低库存预警"
            value={dashboard?.inventory.lowStockCount ?? summary.lowStockCount}
            hint="建议优先补货"
            accent="danger"
          />
          <StatCard
            title="已批准"
            value={dashboard?.memberCount ?? "—"}
            hint="可见成员数量"
            accent="ink"
          />
        </div>
      </section>

      <section className="dashboard-command-strip">
        <div>
          <p className="eyebrow">{roleLabel} · 快捷入口</p>
          <strong>从一个入口处理今天最重要的工作</strong>
          <span>项目、物资、资料和会议保持在同一条上下文里。</span>
        </div>
        <div className="dashboard-command-actions">
          <button className="primary-button" type="button" onClick={() => onOpenView("projects")}>
            查看我的项目
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onOpenView("inventory")}
          >
            {canApprove ? "进入审批中心" : "申请物资"}
          </button>
          <button className="tertiary-button" type="button" onClick={() => onOpenView("meetings")}>
            查看会议通知
          </button>
        </div>
      </section>

      <SectionCard
        title="组织概览"
        eyebrow="Drill-down"
        extra={<span className="panel-tag">可继续下钻</span>}
      >
        <div className="dashboard-drill-grid">
          <button
            className="dashboard-drill-card"
            type="button"
            onClick={() => onOpenView("projects")}
          >
            <span>成员与项目</span>
            <strong>{projects.length}</strong>
            <small>项目 → 负责人 → 任务与成果</small>
          </button>
          <button
            className="dashboard-drill-card"
            type="button"
            onClick={() => onOpenView("inventory")}
          >
            <span>物资与库存</span>
            <strong>{materials.length}</strong>
            <small>物资 → 库存 → 申请与借还流水</small>
          </button>
          <button
            className="dashboard-drill-card"
            type="button"
            onClick={() => onOpenView("files")}
          >
            <span>资料与知识</span>
            <strong>NAS</strong>
            <small>项目资料 → 文件版本 → 引用来源</small>
          </button>
          <button
            className="dashboard-drill-card"
            type="button"
            onClick={() => onOpenView("meetings")}
          >
            <span>会议与进展</span>
            <strong>{notifications.length}</strong>
            <small>会议 → 参会 → 纪要与项目进度</small>
          </button>
        </div>
      </SectionCard>

      <div className="split-layout">
        <SectionCard title="项目概览" eyebrow="Projects">
          {activeProjects.length === 0 ? (
            <EmptyState
              title="暂无进行中的项目"
              text="创建或激活项目后，这里会展示负责人、周期与状态。"
            />
          ) : (
            <div className="data-list">
              {activeProjects.slice(0, 4).map((project) => (
                <button
                  key={project.id}
                  className="list-row project-row dashboard-project-row"
                  type="button"
                  onClick={() => {
                    onSelectProject(project.id);
                    onOpenView("projects");
                  }}
                >
                  <div>
                    <strong>{project.name}</strong>
                    <small>{project.ownerName}</small>
                  </div>
                  <div>
                    <small>周期</small>
                    <span>
                      {project.endsAt
                        ? new Date(project.endsAt).toLocaleDateString("zh-CN")
                        : "未设定"}
                    </span>
                  </div>
                  <StatusBadge tone="active">进行中</StatusBadge>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="系统提醒" eyebrow="Inbox">
          {recentNotices.length === 0 ? (
            <EmptyState title="暂无新提醒" text="会议通知、审批变化和系统公告会汇总在这里。" />
          ) : (
            <div className="data-list">
              {recentNotices.map((item) => (
                <article key={item.id} className="notice-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.content}</p>
                  </div>
                  <small>
                    {new Date(item.createdAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </small>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="split-layout three">
        <SectionCard title="重点任务" eyebrow="Tasks">
          {recentTasks.length === 0 ? (
            <EmptyState title="暂无任务动态" text="项目任务更新后，这里会展示最新处理状态。" />
          ) : (
            <div className="data-list compact">
              {recentTasks.map((task) => (
                <article key={task.id} className="list-row">
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.assigneeName ?? "待指派"}</small>
                  </div>
                  <StatusBadge tone={task.status === "done" ? "muted" : "pending"}>
                    {task.status === "in_progress"
                      ? "进行中"
                      : task.status === "review"
                        ? "待评审"
                        : task.status === "done"
                          ? "已完成"
                          : "待开始"}
                  </StatusBadge>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="低库存清单" eyebrow="Inventory">
          {lowStock.length === 0 ? (
            <EmptyState title="当前库存健康" text="没有达到预警阈值的耗材。" />
          ) : (
            <div className="data-list compact">
              {lowStock.map((material) => (
                <article key={material.id} className="list-row">
                  <div>
                    <strong>{material.name}</strong>
                    <small>{material.spec}</small>
                  </div>
                  <span className="numeric">
                    {material.stock} {material.unit}
                  </span>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="待审申请" eyebrow="Approvals">
          {pendingApplications.length === 0 ? (
            <EmptyState title="当前无需审批" text="新的领用申请提交后会自动出现在这里。" />
          ) : (
            <div className="data-list compact">
              {pendingApplications.map((item) => (
                <article key={item.id} className="list-row">
                  <div>
                    <strong>{item.materialName}</strong>
                    <small>{item.applicantName}</small>
                  </div>
                  <span className="numeric">{item.quantity}</span>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
