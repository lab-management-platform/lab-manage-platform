import { Plus, Users as UsersIcon, FileText, Calendar, CheckCircle2, Clock, Send } from "lucide-react";
import { useState } from "react";

interface ProjectData {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  status: "active" | "archived" | "completed";
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
}

interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId?: string;
  assigneeName?: string;
  priority: string;
  status: string;
  dueDate?: string;
}

interface ProgressReport {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
}

interface ProjectMember {
  userId: string;
  userName: string;
  memberRole: string;
  joinedAt: string;
}

interface ProjectsPanelProps {
  projects: ProjectData[];
  selectedProjectId: string;
  setSelectedProjectId: (v: string) => void;
  tasks: ProjectTask[];
  progressReports: ProgressReport[];
  members: ProjectMember[];
  role: string;
  loading: boolean;
  newProjectName: string;
  setNewProjectName: (v: string) => void;
  newProjectDesc: string;
  setNewProjectDesc: (v: string) => void;
  progressTitle: string;
  setProgressTitle: (v: string) => void;
  progressContent: string;
  setProgressContent: (v: string) => void;
  taskTitle: string;
  setTaskTitle: (v: string) => void;
  taskAssignee: string;
  setTaskAssignee: (v: string) => void;
  taskPriority: string;
  setTaskPriority: (v: string) => void;
  onCreateProject: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onApproveProject: (projectId: string) => void;
  onUploadProgress: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onCreateTask: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onCompleteTask: (taskId: string) => void;
}

export function ProjectsPanel({
  projects,
  selectedProjectId, setSelectedProjectId,
  tasks, progressReports, members, role, loading,
  newProjectName, setNewProjectName, newProjectDesc, setNewProjectDesc,
  progressTitle, setProgressTitle, progressContent, setProgressContent,
  taskTitle, setTaskTitle, taskAssignee, setTaskAssignee,
  taskPriority, setTaskPriority,
  onCreateProject, onApproveProject, onUploadProgress, onCreateTask, onCompleteTask,
}: ProjectsPanelProps) {
  const isAdmin = role === "lab_admin";
  const isProfessor = role === "professor" || isAdmin;
  const isStudent = role === "student";

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const statusText: Record<string, string> = {
    active: "进行中", archived: "已归档", completed: "已完成",
    todo: "待办", in_progress: "进行中", review: "审核中", done: "已完成"
  };
  const priorityText: Record<string, string> = { low: "低", medium: "中", high: "高", urgent: "紧急" };
  const rolText: Record<string, string> = { leader: "学生负责人", member: "学生成员", advisor: "指导教授", manager: "管理教授" };

  return (
    <section className="panel" id="projects-section">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>{isStudent ? "我的项目" : isProfessor ? "管理的项目" : "项目总览"}</h2>
        </div>
        <span>{projects.length} 个项目</span>
      </div>

      <div className="project-layout">
        {/* Project List */}
        <div className="project-list list-frame">
          {projects.length === 0 ? (
            <div className="empty-row">暂无项目。</div>
          ) : (
            projects.map((project) => (
              <article
                key={project.id}
                className={`project-card ${selectedProjectId === project.id ? "selected" : ""}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div>
                  <b className={`pill ${project.status}`}>{statusText[project.status] ?? project.status}</b>
                  <span>{project.startsAt ? new Date(project.startsAt).toLocaleDateString() : ""} ~ {project.endsAt ? new Date(project.endsAt).toLocaleDateString() : "未定"}</span>
                </div>
                <h3>{project.name}</h3>
                <p>{project.description.slice(0, 80)}{project.description.length > 80 ? "..." : ""}</p>
                <small>负责人: {project.ownerName}</small>
              </article>
            ))
          )}
        </div>

        {/* Project Detail */}
        <div className="project-detail">
          {selectedProject ? (
            <>
              {isAdmin && selectedProject.status === "pending" ? (
                <div className="project-approval-bar">
                  <span>⏳ 此项目等待审批</span>
                  <button className="primary" disabled={loading} onClick={() => onApproveProject(selectedProject.id)}>
                    批准项目
                  </button>
                </div>
              ) : null}
              {/* Members */}
              <div className="project-section">
                <h4><UsersIcon size={15} /> 项目成员</h4>
                <div className="member-grid">
                  {members.map((m) => (
                    <span key={m.userId} className="member-tag">
                      {m.userName} · {rolText[m.memberRole] ?? m.memberRole}
                    </span>
                  ))}
                  {members.length === 0 ? <span className="text-muted">暂无成员</span> : null}
                </div>
              </div>

              {/* Tasks */}
              <div className="project-section">
                <h4><CheckCircle2 size={15} /> 任务看板</h4>
                {tasks.map((task) => (
                  <div key={task.id} className="task-row">
                    <span>
                      <b className={`pill ${task.status}`}>{statusText[task.status] ?? task.status}</b>
                      <b className={`pill ${task.priority}`}>{priorityText[task.priority] ?? task.priority}</b>
                      <strong>{task.title}</strong>
                    </span>
                    <small>{task.assigneeName ?? "未分配"} {task.dueDate ? `· ${new Date(task.dueDate).toLocaleDateString()}` : ""}</small>
                    {task.status !== "done" && isProfessor ? (
                      <button type="button" className="ghost" onClick={() => onCompleteTask(task.id)}>
                        标记完成
                      </button>
                    ) : null}
                  </div>
                ))}
                {tasks.length === 0 ? <div className="text-muted">暂无任务</div> : null}
              </div>

              {/* Progress Reports */}
              <div className="project-section">
                <h4><FileText size={15} /> 进度报告</h4>
                {progressReports.map((r) => (
                  <div key={r.id} className="report-card">
                    <div><strong>{r.title}</strong><span>{new Date(r.createdAt).toLocaleString()}</span></div>
                    <p>{r.content.slice(0, 150)}{r.content.length > 150 ? "..." : ""}</p>
                    <small>作者: {r.authorName}</small>
                  </div>
                ))}
                {progressReports.length === 0 ? <div className="text-muted">暂无进度报告</div> : null}
              </div>
            </>
          ) : (
            <div className="empty-row">请从左侧选择一个项目。</div>
          )}
        </div>

        {/* Actions Panel */}
        <div className="project-actions">
          {/* Create Project (professor/admin) */}
          {isProfessor ? (
            <form className="project-form" onSubmit={onCreateProject}>
              <h3>创建项目</h3>
              <label>项目名称<input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} /></label>
              <label>项目描述<textarea value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} /></label>
              <button className="primary" disabled={loading}><Plus size={16} />{loading ? "创建中..." : "创建项目"}</button>
            </form>
          ) : null}

          {/* Upload Progress (student leader) */}
          {selectedProject && isStudent ? (
            <form className="project-form" onSubmit={onUploadProgress}>
              <h3>上传进度报告</h3>
              <label>标题<input value={progressTitle} onChange={(e) => setProgressTitle(e.target.value)} /></label>
              <label>内容<textarea value={progressContent} onChange={(e) => setProgressContent(e.target.value)} /></label>
              <button className="primary" disabled={loading}><Send size={16} />{loading ? "上传中..." : "提交报告"}</button>
            </form>
          ) : null}

          {/* Create Task (professor) */}
          {selectedProject && isProfessor ? (
            <form className="project-form" onSubmit={onCreateTask}>
              <h3>创建任务</h3>
              <label>任务标题<input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></label>
              <label>指派给<input value={taskAssignee} placeholder="用户ID" onChange={(e) => setTaskAssignee(e.target.value)} /></label>
              <label>优先级
                <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                  <option value="medium">中</option><option value="high">高</option><option value="urgent">紧急</option><option value="low">低</option>
                </select>
              </label>
              <button className="primary" disabled={loading}><Plus size={16} />{loading ? "创建中..." : "创建任务"}</button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
