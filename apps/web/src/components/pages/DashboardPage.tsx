import { SectionCard, StatCard, StatusBadge, EmptyState } from "../shared/Ui";
import type {
  InventoryApplication,
  Material,
  NotificationItem,
  Project,
  ProjectTask,
  Summary
} from "../../types";

interface DashboardPageProps {
  actorName: string;
  summary: Summary;
  projects: Project[];
  tasks: ProjectTask[];
  materials: Material[];
  applications: InventoryApplication[];
  notifications: NotificationItem[];
}

export function DashboardPage({
  actorName,
  summary,
  projects,
  tasks,
  materials,
  applications,
  notifications
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

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">实验室运营总览</p>
          <h1>欢迎回来，{actorName}</h1>
          <p className="hero-copy">项目、库存、通知和知识协作都集中在模块页里处理，不再通过长页面滚动查找入口。</p>
        </div>
        <div className="hero-stats">
          <StatCard title="待审批" value={summary.pendingApplications} hint="需要处理的领用申请" accent="gold" />
          <StatCard title="项目进行中" value={activeProjects.length} hint="跨课题并行推进" />
          <StatCard title="低库存预警" value={summary.lowStockCount} hint="建议优先补货" accent="danger" />
          <StatCard title="已批准" value={summary.approvedApplications} hint="本周期流转完成" accent="ink" />
        </div>
      </section>

      <div className="split-layout">
        <SectionCard title="项目概览" eyebrow="Projects">
          {activeProjects.length === 0 ? (
            <EmptyState title="暂无进行中的项目" text="创建或激活项目后，这里会展示负责人、周期与状态。" />
          ) : (
            <div className="data-list">
              {activeProjects.slice(0, 4).map((project) => (
                <article key={project.id} className="list-row project-row">
                  <div>
                    <strong>{project.name}</strong>
                    <small>{project.ownerName}</small>
                  </div>
                  <div>
                    <small>周期</small>
                    <span>{project.endsAt ? new Date(project.endsAt).toLocaleDateString("zh-CN") : "未设定"}</span>
                  </div>
                  <StatusBadge tone="active">进行中</StatusBadge>
                </article>
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
                  <small>{new Date(item.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small>
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
                    {task.status === "in_progress" ? "进行中" : task.status === "review" ? "待评审" : task.status === "done" ? "已完成" : "待开始"}
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
                  <span className="numeric">{material.stock} {material.unit}</span>
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
