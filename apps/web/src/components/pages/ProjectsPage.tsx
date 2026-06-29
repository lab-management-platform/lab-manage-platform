import { useMemo, useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import type {
  Actor,
  ProgressReport,
  Project,
  ProjectMember,
  ProjectTask
} from "../../types";

interface ProjectsPageProps {
  actor: Actor;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  tasks: ProjectTask[];
  progressReports: ProgressReport[];
  members: ProjectMember[];
  onCreateProject: (payload: { name: string; description: string }) => Promise<void>;
  onApproveProject: (projectId: string) => Promise<void>;
  onCreateTask: (payload: {
    projectId: string;
    title: string;
    assigneeId?: string;
    priority: string;
  }) => Promise<void>;
  onCompleteTask: (projectId: string, taskId: string) => Promise<void>;
  onCreateProgress: (payload: { projectId: string; title: string; content: string }) => Promise<void>;
}

export function ProjectsPage({
  actor,
  projects,
  selectedProjectId,
  onSelectProject,
  tasks,
  progressReports,
  members,
  onCreateProject,
  onApproveProject,
  onCreateTask,
  onCompleteTask,
  onCreateProgress
}: ProjectsPageProps) {
  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );
  const [draftProject, setDraftProject] = useState({ name: "", description: "" });
  const [taskDraft, setTaskDraft] = useState({ title: "", assigneeId: "", priority: "medium" });
  const [progressDraft, setProgressDraft] = useState({ title: "", content: "" });

  return (
    <div className="page-grid">
      <div className="column-layout">
        <SectionCard
          title="项目目录"
          eyebrow="Project Registry"
          extra={
            actor.permissions.includes("project:write") ? (
              <span className="panel-tag">
                <span aria-hidden="true">+</span>
                可新建项目
              </span>
            ) : null
          }
        >
          <div className="project-selector-grid">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={project.id === activeProject?.id ? "project-tile active" : "project-tile"}
                onClick={() => onSelectProject(project.id)}
              >
                <div>
                  <strong>{project.name}</strong>
                  <small>{project.ownerName}</small>
                </div>
                <StatusBadge tone={project.status === "active" ? "active" : project.status === "pending" ? "pending" : "muted"}>
                  {project.status === "active" ? "进行中" : project.status === "pending" ? "待审批" : project.status === "completed" ? "已完成" : "已归档"}
                </StatusBadge>
              </button>
            ))}
          </div>
        </SectionCard>

        {actor.permissions.includes("project:write") ? (
          <SectionCard title="创建项目" eyebrow="New Project">
            <form
              className="form-grid"
              onSubmit={async (event) => {
                event.preventDefault();
                await onCreateProject(draftProject);
                setDraftProject({ name: "", description: "" });
              }}
            >
              <label>
                项目名称
                <input
                  value={draftProject.name}
                  onChange={(event) => setDraftProject((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                研究摘要
                <textarea
                  value={draftProject.description}
                  onChange={(event) =>
                    setDraftProject((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <button className="primary-button">创建项目</button>
            </form>
          </SectionCard>
        ) : null}
      </div>

      <div className="column-layout wide">
        <SectionCard
          title={activeProject?.name ?? "项目详情"}
          eyebrow="Project Detail"
          extra={
            activeProject?.status === "pending" && actor.permissions.includes("project:write") ? (
              <button className="secondary-button" type="button" onClick={() => onApproveProject(activeProject.id)}>
                通过立项
              </button>
            ) : null
          }
        >
          {!activeProject ? (
            <EmptyState title="尚未选择项目" text="请选择左侧项目查看概览、成员、任务与进度。" />
          ) : (
            <div className="detail-grid">
              <article className="detail-card">
                <strong>项目概述</strong>
                <p>{activeProject.description || "暂无项目简介。"}</p>
                <div className="meta-grid">
                  <span>负责人：{activeProject.ownerName}</span>
                  <span>状态：{activeProject.status}</span>
                  <span>开始：{activeProject.startsAt ? new Date(activeProject.startsAt).toLocaleDateString("zh-CN") : "未设定"}</span>
                  <span>截止：{activeProject.endsAt ? new Date(activeProject.endsAt).toLocaleDateString("zh-CN") : "未设定"}</span>
                </div>
              </article>

              <article className="detail-card">
                <strong>项目成员</strong>
                <div className="data-list compact">
                  {members.length === 0 ? (
                    <EmptyState title="暂无成员信息" text="项目成员会在后端数据接入后展示。" />
                  ) : (
                    members.map((member) => (
                      <div key={`${member.projectId}-${member.userId}`} className="list-row">
                        <div>
                          <strong>{member.userName ?? member.userId}</strong>
                          <small>{member.memberRole}</small>
                        </div>
                        <small>{new Date(member.joinedAt).toLocaleDateString("zh-CN")}</small>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          )}
        </SectionCard>

        <div className="split-layout">
          <SectionCard title="任务看板" eyebrow="Tasks">
            {activeProject && actor.permissions.includes("project:write") ? (
              <form
                className="inline-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onCreateTask({
                    projectId: activeProject.id,
                    title: taskDraft.title,
                    assigneeId: taskDraft.assigneeId || undefined,
                    priority: taskDraft.priority
                  });
                  setTaskDraft({ title: "", assigneeId: "", priority: "medium" });
                }}
              >
                <input
                  placeholder="新增项目任务"
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                />
                <select
                  value={taskDraft.priority}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
                <button className="secondary-button">添加</button>
              </form>
            ) : null}

            <div className="data-list">
              {tasks.length === 0 ? (
                <EmptyState title="暂无任务" text="给当前项目创建任务后，这里会形成可追踪的执行列表。" />
              ) : (
                tasks.map((task) => (
                  <article key={task.id} className="task-card">
                    <div>
                      <strong>{task.title}</strong>
                      <small>{task.assigneeName ?? "待指派"}</small>
                    </div>
                    <p>{task.description || "暂无任务说明。"}</p>
                    <div className="row-inline">
                      <StatusBadge tone={task.status === "done" ? "muted" : task.status === "in_progress" ? "active" : "pending"}>
                        {task.status}
                      </StatusBadge>
                      {task.status !== "done" && activeProject ? (
                        <button
                          type="button"
                          className="tertiary-button"
                          onClick={() => onCompleteTask(activeProject.id, task.id)}
                        >
                          标记完成
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="进度纪要" eyebrow="Progress Reports">
            {activeProject && actor.permissions.includes("project:progress") ? (
              <form
                className="form-grid compact"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onCreateProgress({
                    projectId: activeProject.id,
                    title: progressDraft.title,
                    content: progressDraft.content
                  });
                  setProgressDraft({ title: "", content: "" });
                }}
              >
                <input
                  placeholder="本次进度标题"
                  value={progressDraft.title}
                  onChange={(event) =>
                    setProgressDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
                <textarea
                  placeholder="记录阶段成果、风险与下一步安排"
                  value={progressDraft.content}
                  onChange={(event) =>
                    setProgressDraft((current) => ({ ...current, content: event.target.value }))
                  }
                />
                <button className="secondary-button">提交进度</button>
              </form>
            ) : null}

            <div className="data-list">
              {progressReports.length === 0 ? (
                <EmptyState title="暂无进度报告" text="上传周报、阶段总结或关键实验结果后会显示在这里。" />
              ) : (
                progressReports.map((report) => (
                  <article key={report.id} className="progress-card">
                    <strong>{report.title}</strong>
                    <small>
                      {report.authorName} · {new Date(report.createdAt).toLocaleString("zh-CN")}
                    </small>
                    <p>{report.content}</p>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
