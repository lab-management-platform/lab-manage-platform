import { useEffect, useMemo, useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import { IdentityLookupField } from "../projects/IdentityLookupField";
import { ProjectTreeWorkspace } from "../projects/ProjectTreeWorkspace";
import {
  identityTypeText,
  memberRoleText,
  projectStatusText,
  treeStatusText
} from "../../utils/helpers";
import type {
  Actor,
  ManagedUser,
  ProgressReport,
  Project,
  ProjectMember,
  ProjectReportDetail,
  ProjectTask,
  ProjectTreeSnapshot,
  ProjectTreeNode
} from "../../types";

interface ProjectsPageProps {
  actor: Actor;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  tasks: ProjectTask[];
  progressReports: ProgressReport[];
  projectTree: ProjectTreeNode[];
  projectTreeSnapshots: ProjectTreeSnapshot[];
  members: ProjectMember[];
  users: ManagedUser[];
  onCreateProject: (payload: {
    name: string;
    description: string;
    ownerName?: string;
    ownerIdentityNo?: string;
    ownerUserId?: string;
    advisorName?: string;
    advisorIdentityNo?: string;
    advisorUserId?: string;
    reportCycleDays?: number;
  }) => Promise<void>;
  onApproveProject: (projectId: string) => Promise<void>;
  onCreateTask: (payload: {
    projectId: string;
    title: string;
    assigneeId?: string;
    priority: string;
  }) => Promise<void>;
  onCompleteTask: (projectId: string, taskId: string) => Promise<void>;
  onAddProjectMember: (
    projectId: string,
    payload: { userName: string; identityNo: string; memberRole: string }
  ) => Promise<void>;
  onUpdateProjectMember: (projectId: string, userId: string, memberRole: string) => Promise<void>;
  onRemoveProjectMember: (projectId: string, userId: string) => Promise<void>;
  onSaveProjectTree: (
    projectId: string,
    nodes: Array<{
      id?: string;
      parentId?: string;
      title: string;
      status: "todo" | "doing" | "done";
      sortOrder?: number;
      ownerUserId?: string;
      remark?: string;
      deliverableNote?: string;
      collapsed?: boolean;
    }>
  ) => Promise<void>;
  onCreateProjectTreeSnapshot: (projectId: string) => Promise<void>;
  onCreateProjectReport: (payload: {
    projectId: string;
    title: string;
    content: string;
    summary?: string;
    nextPlan?: string;
    helpNeeded?: string;
    memberWork?: Array<{
      userId?: string;
      memberName: string;
      memberIdentityNo?: string;
      workSummary: string;
      progressStatus: "todo" | "doing" | "done";
    }>;
  }) => Promise<void>;
  onLoadProjectReportDetail: (projectId: string, reportId: string) => Promise<void>;
  projectReportDetail: ProjectReportDetail | null;
}

interface TreePreviewNode extends ProjectTreeNode {
  children: TreePreviewNode[];
}

function buildTreePreview(nodes: ProjectTreeNode[]) {
  const byId = new Map<string, TreePreviewNode>();
  const roots: TreePreviewNode[] = [];

  for (const node of [...nodes].sort((left, right) => left.sortOrder - right.sortOrder)) {
    byId.set(node.id, { ...node, children: [] });
  }

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: TreePreviewNode[]) => {
    items.sort((left, right) => left.sortOrder - right.sortOrder);
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

function findTreeSnapshot(
  snapshots: ProjectTreeSnapshot[],
  detail: ProjectReportDetail | null
): ProjectTreeSnapshot | null {
  if (!detail?.treeSnapshotId) {
    return null;
  }
  return (
    detail.treeSnapshot ??
    snapshots.find((snapshot) => snapshot.id === detail.treeSnapshotId) ??
    null
  );
}

function projectTreeNodeTone(status: ProjectTreeNode["status"]) {
  if (status === "done") {
    return "active";
  }
  if (status === "doing") {
    return "pending";
  }
  return "muted";
}

export function ProjectsPage({
  actor,
  projects,
  selectedProjectId,
  onSelectProject,
  tasks,
  progressReports,
  projectTree,
  projectTreeSnapshots,
  members,
  users,
  onCreateProject,
  onApproveProject,
  onCreateTask,
  onCompleteTask,
  onAddProjectMember,
  onUpdateProjectMember,
  onRemoveProjectMember,
  onSaveProjectTree,
  onCreateProjectTreeSnapshot,
  onCreateProjectReport,
  onLoadProjectReportDetail,
  projectReportDetail
}: ProjectsPageProps) {
  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );
  const [draftProject, setDraftProject] = useState({
    name: "",
    description: "",
    ownerUserId: "",
    ownerName: "",
    ownerIdentityNo: "",
    advisorUserId: "",
    advisorName: "",
    advisorIdentityNo: "",
    reportCycleDays: "14"
  });
  const [taskDraft, setTaskDraft] = useState({ title: "", assigneeId: "", priority: "medium" });
  const [memberDraft, setMemberDraft] = useState({
    userName: "",
    identityNo: "",
    memberRole: "member"
  });
  const [structuredReportDraft, setStructuredReportDraft] = useState({
    title: "",
    content: "",
    summary: "",
    nextPlan: "",
    helpNeeded: ""
  });
  const [reportMemberDraft, setReportMemberDraft] = useState<
    Array<{
      userId?: string;
      memberName: string;
      memberIdentityNo?: string;
      workSummary: string;
      progressStatus: "todo" | "doing" | "done";
    }>
  >([]);
  const [treeFlipped, setTreeFlipped] = useState(false);
  const [treeWorkspaceOpen, setTreeWorkspaceOpen] = useState(false);

  useEffect(() => {
    setReportMemberDraft(
      members.map((member) => ({
        userId: member.userId,
        memberName: member.userName,
        memberIdentityNo: member.identityNo,
        workSummary: "",
        progressStatus: "doing"
      }))
    );
  }, [members]);

  const ownerOptions = users.filter((user) => user.role === "student");
  const advisorOptions = users.filter((user) => ["professor", "lab_admin"].includes(user.role));
  const currentMember = members.find((member) => member.userId === actor.id);
  const canManageProject =
    actor.permissions.includes("project:write") ||
    currentMember?.memberRole === "owner" ||
    currentMember?.memberRole === "advisor";
  const canManageMembers =
    actor.permissions.includes("project:write") || currentMember?.memberRole === "advisor";
  const treeStats = useMemo(
    () => ({
      done: projectTree.filter((node) => node.status === "done").length,
      doing: projectTree.filter((node) => node.status === "doing").length,
      todo: projectTree.filter((node) => node.status === "todo").length
    }),
    [projectTree]
  );
  const treeCompletion =
    projectTree.length === 0 ? 0 : Math.round((treeStats.done / projectTree.length) * 100);
  const donePercent = projectTree.length === 0 ? 0 : (treeStats.done / projectTree.length) * 100;
  const doingPercent = projectTree.length === 0 ? 0 : (treeStats.doing / projectTree.length) * 100;
  const treePreview = useMemo(() => buildTreePreview(projectTree), [projectTree]);
  const boundReportSnapshot = useMemo(
    () => findTreeSnapshot(projectTreeSnapshots, projectReportDetail),
    [projectReportDetail, projectTreeSnapshots]
  );
  const boundReportTreePreview = useMemo(
    () => buildTreePreview(boundReportSnapshot?.nodes ?? []),
    [boundReportSnapshot]
  );
  const treeRingBackground = useMemo(
    () =>
      `conic-gradient(#2f6f5d 0 ${donePercent}%, #b15f42 ${donePercent}% ${donePercent + doingPercent}%, rgba(255,255,255,0.92) ${donePercent + doingPercent}% 100%)`,
    [doingPercent, donePercent]
  );

  function renderTreeBranch(node: TreePreviewNode, depth = 0) {
    return (
      <div key={node.id} className="tree-branch">
        <article className={`tree-node-card tree-node-${node.status}`}>
          <div className="tree-node-main">
            <div className="tree-node-title-row">
              <strong>{node.title}</strong>
              <StatusBadge tone={projectTreeNodeTone(node.status)}>
                {treeStatusText(node.status)}
              </StatusBadge>
            </div>
            <div className="tree-node-meta">
              <span>层级 {depth + 1}</span>
              {node.ownerName ? <span>责任人 · {node.ownerName}</span> : null}
              {node.deliverableNote ? <span>交付 · {node.deliverableNote}</span> : null}
            </div>
            {node.remark ? <p>{node.remark}</p> : null}
          </div>
        </article>
        {node.children.length > 0 ? (
          <div className="tree-children">
            {node.children.map((child) => renderTreeBranch(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

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
                className={
                  project.id === activeProject?.id ? "project-tile active" : "project-tile"
                }
                onClick={() => onSelectProject(project.id)}
              >
                <div>
                  <strong>{project.name}</strong>
                  <small>
                    {project.ownerName}
                    {project.advisorName ? ` · 导师 ${project.advisorName}` : ""}
                  </small>
                </div>
                <StatusBadge
                  tone={
                    project.status === "active"
                      ? "active"
                      : project.status === "pending"
                        ? "pending"
                        : "muted"
                  }
                >
                  {projectStatusText(project.status)}
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
                await onCreateProject({
                  name: draftProject.name,
                  description: draftProject.description,
                  ownerName: draftProject.ownerName,
                  ownerIdentityNo: draftProject.ownerIdentityNo,
                  ownerUserId: draftProject.ownerUserId || undefined,
                  advisorName: draftProject.advisorName || undefined,
                  advisorIdentityNo: draftProject.advisorIdentityNo || undefined,
                  advisorUserId: draftProject.advisorUserId || undefined,
                  reportCycleDays: Number(draftProject.reportCycleDays || 14)
                });
                setDraftProject({
                  name: "",
                  description: "",
                  ownerUserId: "",
                  ownerName: "",
                  ownerIdentityNo: "",
                  advisorUserId: "",
                  advisorName: "",
                  advisorIdentityNo: "",
                  reportCycleDays: "14"
                });
              }}
            >
              <label>
                项目名称
                <input
                  value={draftProject.name}
                  onChange={(event) =>
                    setDraftProject((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <IdentityLookupField
                label="学生负责人"
                placeholder="输入学生姓名"
                helper="支持按姓名、学号或账号检索，适合成员很多时快速定位。"
                users={ownerOptions}
                value={{
                  userId: draftProject.ownerUserId || undefined,
                  name: draftProject.ownerName,
                  identityNo: draftProject.ownerIdentityNo
                }}
                onChange={(value) =>
                  setDraftProject((current) => ({
                    ...current,
                    ownerUserId: value.userId ?? "",
                    ownerName: value.name,
                    ownerIdentityNo: value.identityNo
                  }))
                }
              />
              <IdentityLookupField
                label="导师"
                placeholder="输入导师姓名"
                helper="可留空；推荐按姓名或工号检索，而不是滚长下拉。"
                users={advisorOptions}
                allowEmpty
                value={{
                  userId: draftProject.advisorUserId || undefined,
                  name: draftProject.advisorName,
                  identityNo: draftProject.advisorIdentityNo
                }}
                onChange={(value) =>
                  setDraftProject((current) => ({
                    ...current,
                    advisorUserId: value.userId ?? "",
                    advisorName: value.name,
                    advisorIdentityNo: value.identityNo
                  }))
                }
              />
              <label>
                汇报周期（天）
                <input
                  type="number"
                  min={7}
                  step={1}
                  value={draftProject.reportCycleDays}
                  onChange={(event) =>
                    setDraftProject((current) => ({
                      ...current,
                      reportCycleDays: event.target.value
                    }))
                  }
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
        {activeProject && treeWorkspaceOpen ? (
          <ProjectTreeWorkspace
            project={activeProject}
            members={members}
            nodes={projectTree}
            snapshots={projectTreeSnapshots}
            canManage={canManageProject}
            onExit={() => setTreeWorkspaceOpen(false)}
            onSave={onSaveProjectTree}
            onCreateSnapshot={onCreateProjectTreeSnapshot}
          />
        ) : null}

        {!treeWorkspaceOpen ? (
          <>
            <SectionCard
              title={activeProject?.name ?? "项目详情"}
              eyebrow="Project Detail"
              extra={
                activeProject?.status === "pending" &&
                actor.permissions.includes("project:write") ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onApproveProject(activeProject.id)}
                  >
                    通过立项
                  </button>
                ) : null
              }
            >
              {!activeProject ? (
                <EmptyState
                  title="尚未选择项目"
                  text="请选择左侧项目查看概览、成员、任务与进度。"
                />
              ) : (
                <div className="detail-grid">
                  <article className="detail-card">
                    <strong>项目概述</strong>
                    <p>{activeProject.description || "暂无项目简介。"}</p>
                    <div className="meta-grid">
                      <span>
                        学生负责人：{activeProject.ownerName} · {activeProject.ownerIdentityNo}
                      </span>
                      <span>
                        导师：
                        {activeProject.advisorName
                          ? `${activeProject.advisorName} · ${activeProject.advisorIdentityNo ?? "-"}`
                          : "未设定"}
                      </span>
                      <span>状态：{projectStatusText(activeProject.status)}</span>
                      <span>汇报周期：{activeProject.reportCycleDays} 天</span>
                      <span>
                        开始：
                        {activeProject.startsAt
                          ? new Date(activeProject.startsAt).toLocaleDateString("zh-CN")
                          : "未设定"}
                      </span>
                      <span>
                        截止：
                        {activeProject.endsAt
                          ? new Date(activeProject.endsAt).toLocaleDateString("zh-CN")
                          : "未设定"}
                      </span>
                      <span>
                        下次汇报：
                        {activeProject.nextReportDueAt
                          ? new Date(activeProject.nextReportDueAt).toLocaleDateString("zh-CN")
                          : "未设定"}
                      </span>
                    </div>
                  </article>

                  <article className="detail-card">
                    <div className="row-inline spread">
                      <strong>项目成员</strong>
                      {canManageMembers ? (
                        <span className="panel-tag">导师/管理员维护</span>
                      ) : (
                        <span className="panel-tag">学生只读</span>
                      )}
                    </div>
                    {activeProject && canManageMembers ? (
                      <form
                        className="form-grid compact"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          await onAddProjectMember(activeProject.id, memberDraft);
                          setMemberDraft({ userName: "", identityNo: "", memberRole: "member" });
                        }}
                      >
                        <div className="member-entry-grid">
                          <label>
                            姓名
                            <input
                              placeholder="输入成员姓名"
                              value={memberDraft.userName}
                              onChange={(event) =>
                                setMemberDraft((current) => ({
                                  ...current,
                                  userName: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label>
                            学号 / 工号
                            <input
                              placeholder="输入学号或工号"
                              value={memberDraft.identityNo}
                              onChange={(event) =>
                                setMemberDraft((current) => ({
                                  ...current,
                                  identityNo: event.target.value
                                }))
                              }
                            />
                          </label>
                        </div>
                        <label>
                          项目角色
                          <select
                            value={memberDraft.memberRole}
                            onChange={(event) =>
                              setMemberDraft((current) => ({
                                ...current,
                                memberRole: event.target.value
                              }))
                            }
                          >
                            <option value="leader">组内负责人</option>
                            <option value="member">成员</option>
                            <option value="observer">观察者</option>
                          </select>
                        </label>
                        <button className="secondary-button">按姓名与学号/工号添加成员</button>
                      </form>
                    ) : null}
                    <div className="data-list compact">
                      {members.length === 0 ? (
                        <EmptyState title="暂无成员信息" text="项目成员会在后端数据接入后展示。" />
                      ) : (
                        members.map((member) => (
                          <div
                            key={`${member.projectId}-${member.userId}`}
                            className="member-row-card"
                          >
                            <div className="row-inline spread">
                              <div>
                                <strong>{member.userName}</strong>
                                <small>
                                  {memberRoleText(member.memberRole)} ·{" "}
                                  {identityTypeText(member.identityType)} {member.identityNo}
                                </small>
                              </div>
                              <small>{new Date(member.joinedAt).toLocaleDateString("zh-CN")}</small>
                            </div>
                            {canManageMembers &&
                            !["owner", "advisor"].includes(member.memberRole) &&
                            activeProject ? (
                              <div className="member-actions-row">
                                <select
                                  value={member.memberRole}
                                  onChange={async (event) => {
                                    await onUpdateProjectMember(
                                      activeProject.id,
                                      member.userId,
                                      event.target.value
                                    );
                                  }}
                                >
                                  <option value="leader">组内负责人</option>
                                  <option value="member">成员</option>
                                  <option value="observer">观察者</option>
                                </select>
                                <button
                                  type="button"
                                  className="tertiary-button ghost-tone"
                                  onClick={async () => {
                                    await onRemoveProjectMember(activeProject.id, member.userId);
                                  }}
                                >
                                  移除成员
                                </button>
                              </div>
                            ) : null}
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
                {activeProject && canManageProject ? (
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
                      onChange={(event) =>
                        setTaskDraft((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                    <select
                      value={taskDraft.priority}
                      onChange={(event) =>
                        setTaskDraft((current) => ({ ...current, priority: event.target.value }))
                      }
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                      <option value="urgent">紧急</option>
                    </select>
                    <select
                      value={taskDraft.assigneeId}
                      onChange={(event) =>
                        setTaskDraft((current) => ({ ...current, assigneeId: event.target.value }))
                      }
                    >
                      <option value="">待指派</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.userName} · {member.identityNo}
                        </option>
                      ))}
                    </select>
                    <button className="secondary-button">添加</button>
                  </form>
                ) : null}

                <div className="data-list">
                  {tasks.length === 0 ? (
                    <EmptyState
                      title="暂无任务"
                      text="给当前项目创建任务后，这里会形成可追踪的执行列表。"
                    />
                  ) : (
                    tasks.map((task) => (
                      <article key={task.id} className="task-card">
                        <div>
                          <strong>{task.title}</strong>
                          <small>
                            {task.assigneeName
                              ? `${task.assigneeName} · ${task.assigneeIdentityNo ?? "未登记身份号"}`
                              : "待指派"}
                          </small>
                        </div>
                        <p>{task.description || "暂无任务说明。"}</p>
                        <div className="row-inline">
                          <StatusBadge
                            tone={
                              task.status === "done"
                                ? "muted"
                                : task.status === "in_progress"
                                  ? "active"
                                  : "pending"
                            }
                          >
                            {task.status}
                          </StatusBadge>
                          {task.status !== "done" &&
                          activeProject &&
                          (canManageProject || task.assigneeId === actor.id) ? (
                            <button
                              type="button"
                              className="tertiary-button"
                              onClick={async () => {
                                await onCompleteTask(activeProject.id, task.id);
                              }}
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
                      await onCreateProjectReport({
                        projectId: activeProject.id,
                        title: structuredReportDraft.title,
                        content: structuredReportDraft.content,
                        summary: structuredReportDraft.summary,
                        nextPlan: structuredReportDraft.nextPlan,
                        helpNeeded: structuredReportDraft.helpNeeded,
                        memberWork: reportMemberDraft.filter((item) => item.workSummary.trim())
                      });
                      setStructuredReportDraft({
                        title: "",
                        content: "",
                        summary: "",
                        nextPlan: "",
                        helpNeeded: ""
                      });
                    }}
                  >
                    <input
                      placeholder="本次进度标题"
                      value={structuredReportDraft.title}
                      onChange={(event) =>
                        setStructuredReportDraft((current) => ({
                          ...current,
                          title: event.target.value
                        }))
                      }
                    />
                    <textarea
                      placeholder="当前进展说明"
                      value={structuredReportDraft.content}
                      onChange={(event) =>
                        setStructuredReportDraft((current) => ({
                          ...current,
                          content: event.target.value
                        }))
                      }
                    />
                    <textarea
                      placeholder="阶段总结"
                      value={structuredReportDraft.summary}
                      onChange={(event) =>
                        setStructuredReportDraft((current) => ({
                          ...current,
                          summary: event.target.value
                        }))
                      }
                    />
                    <textarea
                      placeholder="下周期计划"
                      value={structuredReportDraft.nextPlan}
                      onChange={(event) =>
                        setStructuredReportDraft((current) => ({
                          ...current,
                          nextPlan: event.target.value
                        }))
                      }
                    />
                    <textarea
                      placeholder="需要协助的问题"
                      value={structuredReportDraft.helpNeeded}
                      onChange={(event) =>
                        setStructuredReportDraft((current) => ({
                          ...current,
                          helpNeeded: event.target.value
                        }))
                      }
                    />
                    <div className="report-member-grid">
                      {reportMemberDraft.map((item, index) => (
                        <label key={item.userId ?? item.memberName} className="report-member-card">
                          <strong>
                            {item.memberName} · {item.memberIdentityNo}
                          </strong>
                          <select
                            value={item.progressStatus}
                            onChange={(event) =>
                              setReportMemberDraft((current) =>
                                current.map((member, memberIndex) =>
                                  memberIndex === index
                                    ? {
                                        ...member,
                                        progressStatus: event.target
                                          .value as typeof item.progressStatus
                                      }
                                    : member
                                )
                              )
                            }
                          >
                            <option value="todo">未开始</option>
                            <option value="doing">进行中</option>
                            <option value="done">已完成</option>
                          </select>
                          <textarea
                            placeholder="填写该成员本周期完成的工作"
                            value={item.workSummary}
                            onChange={(event) =>
                              setReportMemberDraft((current) =>
                                current.map((member, memberIndex) =>
                                  memberIndex === index
                                    ? { ...member, workSummary: event.target.value }
                                    : member
                                )
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <button className="secondary-button">提交结构化汇报</button>
                  </form>
                ) : null}

                <div className="split-layout report-detail-layout">
                  <div className="data-list">
                    {progressReports.length === 0 ? (
                      <EmptyState
                        title="暂无进度报告"
                        text="上传周报、阶段总结或关键实验结果后会显示在这里。"
                      />
                    ) : (
                      progressReports.map((report) => (
                        <button
                          key={report.id}
                          type="button"
                          className="progress-card report-list-button"
                          onClick={async () => {
                            if (activeProject) {
                              await onLoadProjectReportDetail(activeProject.id, report.id);
                            }
                          }}
                        >
                          <strong>{report.title}</strong>
                          <small>
                            {report.authorName} ·{" "}
                            {new Date(report.createdAt).toLocaleString("zh-CN")}
                          </small>
                          <p>{report.content}</p>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="detail-card report-detail-card">
                    {!projectReportDetail ? (
                      <EmptyState
                        title="未选择汇报"
                        text="点击左侧任意汇报，查看成员工作、总结与下周期计划。"
                      />
                    ) : (
                      <>
                        <strong>{projectReportDetail.title}</strong>
                        <div className="meta-grid">
                          <span>提交人：{projectReportDetail.authorName}</span>
                          <span>
                            时间：{new Date(projectReportDetail.createdAt).toLocaleString("zh-CN")}
                          </span>
                          <span>状态：{projectReportDetail.status ?? "submitted"}</span>
                          <span>
                            树快照：
                            {boundReportSnapshot
                              ? `v${boundReportSnapshot.version}`
                              : (projectReportDetail.treeSnapshotId ?? "未绑定")}
                          </span>
                        </div>
                        <p>{projectReportDetail.content}</p>
                        <div className="report-detail-block">
                          <h3>绑定项目树快照</h3>
                          {!boundReportSnapshot ? (
                            <EmptyState
                              title="未绑定结构快照"
                              text="这份汇报没有携带项目树结构。"
                            />
                          ) : (
                            <div className="report-snapshot-panel">
                              <div className="report-snapshot-head">
                                <div>
                                  <strong>结构版本 v{boundReportSnapshot.version}</strong>
                                  <small>
                                    {boundReportSnapshot.createdByName} ·{" "}
                                    {new Date(boundReportSnapshot.createdAt).toLocaleString(
                                      "zh-CN"
                                    )}
                                  </small>
                                </div>
                                <StatusBadge tone="muted">
                                  {boundReportSnapshot.nodes.length} 个节点
                                </StatusBadge>
                              </div>
                              <div className="tree-status-band snapshot-band">
                                <span>
                                  已完成{" "}
                                  {
                                    boundReportSnapshot.nodes.filter(
                                      (node) => node.status === "done"
                                    ).length
                                  }
                                </span>
                                <span>
                                  进行中{" "}
                                  {
                                    boundReportSnapshot.nodes.filter(
                                      (node) => node.status === "doing"
                                    ).length
                                  }
                                </span>
                                <span>
                                  未开始{" "}
                                  {
                                    boundReportSnapshot.nodes.filter(
                                      (node) => node.status === "todo"
                                    ).length
                                  }
                                </span>
                              </div>
                              <div className="report-snapshot-tree">
                                {boundReportTreePreview.map((node) => renderTreeBranch(node))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="report-detail-block">
                          <h3>阶段总结</h3>
                          <p>{projectReportDetail.summary || "未填写"}</p>
                        </div>
                        <div className="report-detail-block">
                          <h3>下周期计划</h3>
                          <p>{projectReportDetail.nextPlan || "未填写"}</p>
                        </div>
                        <div className="report-detail-block">
                          <h3>需要协助</h3>
                          <p>{projectReportDetail.helpNeeded || "未填写"}</p>
                        </div>
                        <div className="report-detail-block">
                          <h3>成员工作情况</h3>
                          <div className="data-list compact">
                            {projectReportDetail.memberWork.length === 0 ? (
                              <EmptyState
                                title="暂无成员工作记录"
                                text="这份汇报还没有逐人工作条目。"
                              />
                            ) : (
                              projectReportDetail.memberWork.map((item) => (
                                <div key={item.id} className="member-row-card">
                                  <div className="row-inline spread">
                                    <div>
                                      <strong>{item.memberName}</strong>
                                      <small>{item.memberIdentityNo ?? "未登记身份号"}</small>
                                    </div>
                                    <StatusBadge
                                      tone={
                                        item.progressStatus === "done"
                                          ? "active"
                                          : item.progressStatus === "doing"
                                            ? "pending"
                                            : "muted"
                                      }
                                    >
                                      {treeStatusText(item.progressStatus)}
                                    </StatusBadge>
                                  </div>
                                  <p>{item.workSummary}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="项目树进度卡" eyebrow="Project Tree">
              <div className={treeFlipped ? "tree-flip-shell flipped" : "tree-flip-shell"}>
                <div className="tree-flip-stage">
                  <article className="tree-card-face tree-card-front">
                    <div className="tree-card-summary">
                      <div className="tree-ring" style={{ background: treeRingBackground }}>
                        <div className="tree-ring-inner">
                          <strong>{treeCompletion}%</strong>
                          <span>完成率</span>
                        </div>
                      </div>
                      <div className="tree-card-copy">
                        <strong>正面：阶段完成度</strong>
                        <p>
                          用环图快速看整体推进，用三态统计看卡点；翻面后切到层状树预览，再进入编辑区维护结构。
                        </p>
                        <div className="tree-status-band">
                          <span>已完成 {treeStats.done}</span>
                          <span>进行中 {treeStats.doing}</span>
                          <span>未开始 {treeStats.todo}</span>
                          <span>节点总数 {projectTree.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="tree-card-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setTreeFlipped(true)}
                      >
                        查看层状树
                      </button>
                      {canManageProject ? (
                        <button
                          type="button"
                          className="tertiary-button"
                          onClick={() => setTreeWorkspaceOpen(true)}
                        >
                          进入树工作台
                        </button>
                      ) : null}
                    </div>
                  </article>

                  <article className="tree-card-face tree-card-back">
                    <div className="row-inline spread">
                      <div>
                        <strong>背面：层状树预览</strong>
                        <p className="muted-paragraph">按父子层级展示，不再是简单平铺列表。</p>
                      </div>
                      <div className="tree-card-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setTreeFlipped(false)}
                        >
                          返回环图
                        </button>
                        {canManageProject ? (
                          <button
                            type="button"
                            className="tertiary-button"
                            onClick={() => setTreeWorkspaceOpen(true)}
                          >
                            进入树工作台
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {projectTree.length === 0 ? (
                      <EmptyState title="暂无项目树" text="先创建主节点，再为节点添加子层级。" />
                    ) : (
                      <div className="tree-layered-preview">
                        {treePreview.map((node) => renderTreeBranch(node))}
                      </div>
                    )}
                  </article>
                </div>
              </div>
            </SectionCard>
          </>
        ) : null}
      </div>
    </div>
  );
}
