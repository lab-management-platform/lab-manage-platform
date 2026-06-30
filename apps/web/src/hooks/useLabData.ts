import { useEffect, useMemo, useState } from "react";
import { apiBase } from "../utils/helpers";
import type {
  Actor,
  ChatHistoryRecord,
  ChatMessage,
  ChatResponse,
  FaqTemplate,
  FileVersion,
  InventoryApplication,
  KnowledgeDocument,
  KnowledgeSource,
  LabFile,
  ManagedUser,
  Material,
  Meeting,
  NotificationItem,
  ProgressReport,
  Project,
  ProjectMember,
  ProjectReportDetail,
  ProjectTask,
  ProjectTreeSnapshot,
  ProjectTreeNode,
  StockMovement,
  Summary
} from "../types";

function toAuthorization(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }
  return payload as T;
}

export function useLabData(token: string, actor: Actor | null) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [applications, setApplications] = useState<InventoryApplication[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<Summary>({
    materialCount: 0,
    lowStockCount: 0,
    pendingApplications: 0,
    approvedApplications: 0
  });
  const [files, setFiles] = useState<LabFile[]>([]);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [profile, setProfile] = useState<ManagedUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [projectTree, setProjectTree] = useState<ProjectTreeNode[]>([]);
  const [projectTreeSnapshots, setProjectTreeSnapshots] = useState<ProjectTreeSnapshot[]>([]);
  const [projectReportDetail, setProjectReportDetail] = useState<ProjectReportDetail | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiSources, setAiSources] = useState<KnowledgeSource[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [faqTemplates, setFaqTemplates] = useState<FaqTemplate[]>([]);
  const [message, setMessage] = useState("欢迎进入实验室管理平台。");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.readAt),
    [notifications]
  );

  async function refreshAll(activeToken = token, activeActor = actor) {
    if (!activeToken || !activeActor) {
      return;
    }

    const headers = toAuthorization(activeToken);
    const requests: Promise<void>[] = [
      fetch(`${apiBase}/inventory/summary`, { headers })
        .then(parseResponse<Summary>)
        .then(setSummary),
      fetch(`${apiBase}/inventory/materials`, { headers })
        .then(parseResponse<Material[]>)
        .then(setMaterials),
      fetch(`${apiBase}/inventory/applications`, { headers })
        .then(parseResponse<InventoryApplication[]>)
        .then(setApplications),
      fetch(`${apiBase}/inventory/stock-movements`, { headers })
        .then(parseResponse<StockMovement[]>)
        .then(setStockMovements),
      fetch(`${apiBase}/files`, { headers })
        .then(parseResponse<LabFile[]>)
        .then(setFiles),
      fetch(`${apiBase}/meetings`, { headers })
        .then(parseResponse<Meeting[]>)
        .then(setMeetings),
      fetch(`${apiBase}/notifications`, { headers })
        .then(parseResponse<NotificationItem[]>)
        .then(setNotifications),
      fetch(`${apiBase}/auth/profile`, { headers })
        .then(parseResponse<ManagedUser>)
        .then(setProfile),
      fetch(`${apiBase}/projects`, { headers })
        .then(parseResponse<Project[]>)
        .then(setProjects),
      fetch(`${apiBase}/ai/chat-history`, { headers })
        .then(parseResponse<ChatHistoryRecord[]>)
        .then((history) =>
          setAiMessages(history.map((record) => ({ role: record.role, content: record.content })))
        ),
      fetch(`${apiBase}/ai/knowledge`, { headers })
        .then(parseResponse<KnowledgeDocument[]>)
        .then(setKnowledgeDocs),
      fetch(`${apiBase}/ai/templates`, { headers })
        .then(parseResponse<FaqTemplate[]>)
        .then(setFaqTemplates)
    ];

    if (activeActor.permissions.includes("user:read")) {
      requests.push(
        fetch(`${apiBase}/auth/users`, { headers })
          .then(parseResponse<ManagedUser[]>)
          .then(setUsers)
      );
    } else {
      setUsers([]);
    }

    const results = await Promise.allSettled(requests);
    const rejected = results.find((result) => result.status === "rejected");
    if (rejected?.status === "rejected") {
      throw rejected.reason;
    }
  }

  async function loadProjectWorkspace(projectId: string) {
    if (!token || !projectId) {
      setProjectTasks([]);
      setProjectMembers([]);
      setProgressReports([]);
      setProjectTree([]);
      setProjectTreeSnapshots([]);
      setProjectReportDetail(null);
      return;
    }

    const headers = toAuthorization(token);
    const [tasksData, membersData, progressData, treeData, treeHistoryData] = await Promise.all([
      fetch(`${apiBase}/projects/${projectId}/tasks`, { headers }).then(
        parseResponse<ProjectTask[]>
      ),
      fetch(`${apiBase}/projects/${projectId}/members`, { headers }).then(
        parseResponse<ProjectMember[]>
      ),
      fetch(`${apiBase}/projects/${projectId}/progress`, { headers }).then(
        parseResponse<ProgressReport[]>
      ),
      fetch(`${apiBase}/projects/${projectId}/tree`, { headers }).then(
        parseResponse<ProjectTreeNode[]>
      ),
      fetch(`${apiBase}/projects/${projectId}/tree/history`, { headers }).then(
        parseResponse<ProjectTreeSnapshot[]>
      )
    ]);

    setProjectTasks(tasksData);
    setProjectMembers(membersData);
    setProgressReports(progressData);
    setProjectTree(treeData);
    setProjectTreeSnapshots(treeHistoryData);
    setProjectReportDetail(null);
  }

  useEffect(() => {
    if (!token || !actor) {
      return;
    }
    setLoading(true);
    refreshAll()
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "数据加载失败");
      })
      .finally(() => setLoading(false));
  }, [token, actor]);

  useEffect(() => {
    if (!token || !actor) {
      return;
    }
    const refresh = () => {
      refreshAll(token, actor).catch(() => {
        // best effort
      });
    };
    const eventSource = new EventSource(`${apiBase}/events?token=${encodeURIComponent(token)}`);
    eventSource.addEventListener("domain-event", refresh);
    const timer = window.setInterval(refresh, 45000);
    return () => {
      eventSource.close();
      window.clearInterval(timer);
    };
  }, [token, actor]);

  return {
    loading,
    message,
    setMessage,
    summary,
    materials,
    applications,
    stockMovements,
    files,
    fileVersions,
    meetings,
    notifications,
    unreadNotifications,
    users,
    profile,
    projects,
    projectTasks,
    projectMembers,
    progressReports,
    projectTree,
    projectTreeSnapshots,
    projectReportDetail,
    aiMessages,
    aiLoading,
    aiError,
    aiSources,
    knowledgeDocs,
    faqTemplates,
    refreshAll,
    loadProjectWorkspace,
    async loadFileVersions(fileId: string) {
      if (!token) return;
      const payload = await fetch(`${apiBase}/files/${fileId}/versions`, {
        headers: toAuthorization(token)
      }).then(parseResponse<FileVersion[]>);
      setFileVersions(payload);
    },
    async createProjectFile(payload: {
      projectId: string;
      title: string;
      category: "record" | "dataset" | "meeting" | "other" | "template" | "sop";
      fileKind:
        | "project_tree"
        | "report_doc"
        | "report_ppt"
        | "experiment_record"
        | "design_doc"
        | "api_doc"
        | "code_snapshot"
        | "dataset"
        | "model_weight"
        | "meeting_minutes"
        | "other";
      description: string;
      driveUrl?: string;
      nasPath?: string;
      originalName?: string;
      mimeType?: string;
      sizeBytes?: number;
      contentBase64?: string;
    }) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${payload.projectId}/files`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify({
          title: payload.title,
          category: payload.category,
          fileKind: payload.fileKind,
          description: payload.description,
          driveUrl: payload.driveUrl,
          nasPath: payload.nasPath,
          originalName: payload.originalName,
          mimeType: payload.mimeType,
          sizeBytes: payload.sizeBytes,
          contentBase64: payload.contentBase64
        })
      }).then(parseResponse<LabFile>);
      setMessage("项目资料已上传。");
      await refreshAll();
    },
    async addFileVersion(payload: {
      fileId: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      driveUrl?: string;
      changeNote?: string;
      contentBase64?: string;
    }) {
      if (!token) return;
      await fetch(`${apiBase}/files/${payload.fileId}/versions`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify(payload)
      }).then(parseResponse<FileVersion>);
      setMessage("文件新版本已登记。");
      const versionsPayload = await fetch(`${apiBase}/files/${payload.fileId}/versions`, {
        headers: toAuthorization(token)
      }).then(parseResponse<FileVersion[]>);
      setFileVersions(versionsPayload);
      await refreshAll();
    },
    async submitApplication(payload: {
      materialId: string;
      quantity: number;
      reason: string;
      projectId?: string;
    }) {
      if (!token) return;
      setLoading(true);
      try {
        await fetch(`${apiBase}/inventory/applications`, {
          method: "POST",
          headers: toAuthorization(token),
          body: JSON.stringify(payload)
        }).then(parseResponse<InventoryApplication>);
        setMessage("耗材申请已提交。");
        await refreshAll();
      } finally {
        setLoading(false);
      }
    },
    async stockIn(payload: { materialId: string; quantity: number; remark: string }) {
      if (!token) return;
      setLoading(true);
      try {
        await fetch(`${apiBase}/inventory/materials/${payload.materialId}/stock-in`, {
          method: "PATCH",
          headers: toAuthorization(token),
          body: JSON.stringify({ quantity: payload.quantity, remark: payload.remark })
        }).then(parseResponse<Material>);
        setMessage("入库登记完成。");
        await refreshAll();
      } finally {
        setLoading(false);
      }
    },
    async reviewApplication(applicationId: string, action: "approve" | "reject", remark: string) {
      if (!token) return;
      setLoading(true);
      try {
        await fetch(`${apiBase}/inventory/applications/${applicationId}/${action}`, {
          method: "PATCH",
          headers: toAuthorization(token),
          body: JSON.stringify({ remark })
        }).then(parseResponse<InventoryApplication>);
        setMessage(action === "approve" ? "申请已批准。" : "申请已驳回。");
        await refreshAll();
      } finally {
        setLoading(false);
      }
    },
    async createMeeting(payload: {
      projectId?: string;
      title: string;
      startsAt: string;
      endsAt: string;
      location: string;
      onlineUrl?: string;
      participantIds: string[];
      summary: string;
    }) {
      if (!token) return;
      setLoading(true);
      try {
        await fetch(`${apiBase}/meetings`, {
          method: "POST",
          headers: toAuthorization(token),
          body: JSON.stringify({
            ...payload,
            startsAt: new Date(payload.startsAt).toISOString(),
            endsAt: new Date(payload.endsAt).toISOString()
          })
        }).then(parseResponse<Meeting>);
        setMessage("会议已创建。");
        await refreshAll();
      } finally {
        setLoading(false);
      }
    },
    async publishAnnouncement(payload: { title: string; content: string; projectId?: string }) {
      if (!token) return;
      setLoading(true);
      try {
        await fetch(`${apiBase}/announcements`, {
          method: "POST",
          headers: toAuthorization(token),
          body: JSON.stringify(payload)
        }).then(parseResponse<NotificationItem[]>);
        setMessage("公告已发布。");
        await refreshAll();
      } finally {
        setLoading(false);
      }
    },
    async markNotificationRead(notificationId: string) {
      if (!token) return;
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item
        )
      );
      await fetch(`${apiBase}/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      }).then(parseResponse<NotificationItem>);
      setMessage("通知已标记为已读。");
    },
    async sendAiMessage(messageText: string) {
      const trimmed = messageText.trim();
      if (!token || !trimmed) return;
      setAiLoading(true);
      setAiError("");
      setAiMessages((current) => [...current, { role: "user", content: trimmed }]);
      try {
        const payload = await fetch(`${apiBase}/ai/chat`, {
          method: "POST",
          headers: toAuthorization(token),
          body: JSON.stringify({ message: trimmed })
        }).then(parseResponse<ChatResponse>);
        setAiMessages((current) => [...current, { role: "assistant", content: payload.reply }]);
        setAiSources(payload.sources ?? []);
      } catch (error) {
        setAiError(error instanceof Error ? error.message : "AI 服务调用失败");
      } finally {
        setAiLoading(false);
      }
    },
    async clearAiHistory() {
      if (!token) return;
      await fetch(`${apiBase}/ai/chat-history`, {
        method: "DELETE",
        headers: toAuthorization(token)
      });
      setAiMessages([]);
      setAiSources([]);
      setAiError("");
      setMessage("AI 对话历史已清空。");
    },
    async createKnowledge(payload: {
      title: string;
      content: string;
      category: string;
      tags: string[];
    }) {
      if (!token) return;
      await fetch(`${apiBase}/ai/knowledge`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify(payload)
      }).then(parseResponse<KnowledgeDocument>);
      setMessage("知识文档已添加。");
      await refreshAll();
    },
    async uploadKnowledgeFile(payload: {
      title: string;
      content: string;
      category: string;
      tags: string[];
      fileName?: string;
      mimeType?: string;
    }) {
      if (!token) return;
      await fetch(`${apiBase}/ai/knowledge/upload`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify(payload)
      }).then(parseResponse<KnowledgeDocument>);
      setMessage("知识文件已收录。");
      await refreshAll();
    },
    async deleteKnowledge(id: string) {
      if (!token) return;
      await fetch(`${apiBase}/ai/knowledge/${id}`, {
        method: "DELETE",
        headers: toAuthorization(token)
      });
      setMessage("知识文档已删除。");
      await refreshAll();
    },
    async createProject(payload: {
      name: string;
      description: string;
      ownerName?: string;
      ownerIdentityNo?: string;
      ownerUserId?: string;
      advisorName?: string;
      advisorIdentityNo?: string;
      advisorUserId?: string;
      reportCycleDays?: number;
    }) {
      if (!token) return;
      const project = await fetch(`${apiBase}/projects`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify(payload)
      }).then(parseResponse<Project>);
      setMessage("项目已创建。");
      await refreshAll();
      await loadProjectWorkspace(project.id);
    },
    async approveProject(projectId: string) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${projectId}`, {
        method: "PATCH",
        headers: toAuthorization(token),
        body: JSON.stringify({ status: "active" })
      }).then(parseResponse<Project>);
      setMessage("项目已激活。");
      await refreshAll();
      await loadProjectWorkspace(projectId);
    },
    async createTask(payload: {
      projectId: string;
      title: string;
      assigneeId?: string;
      priority: string;
    }) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${payload.projectId}/tasks`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify({
          title: payload.title,
          assigneeId: payload.assigneeId,
          priority: payload.priority
        })
      }).then(parseResponse<ProjectTask>);
      setMessage("任务已创建。");
      await loadProjectWorkspace(payload.projectId);
    },
    async completeTask(projectId: string, taskId: string) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: toAuthorization(token),
        body: JSON.stringify({ status: "done" })
      }).then(parseResponse<ProjectTask>);
      setMessage("任务已完成。");
      await loadProjectWorkspace(projectId);
    },
    async addProjectMember(
      projectId: string,
      payload: { userName: string; identityNo: string; memberRole: string }
    ) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${projectId}/members`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify(payload)
      }).then(parseResponse<ProjectMember[]>);
      setMessage("项目成员已添加。");
      await loadProjectWorkspace(projectId);
    },
    async updateProjectMember(projectId: string, userId: string, memberRole: string) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        headers: toAuthorization(token),
        body: JSON.stringify({ memberRole })
      }).then(parseResponse<ProjectMember[]>);
      setMessage("成员角色已更新。");
      await loadProjectWorkspace(projectId);
    },
    async removeProjectMember(projectId: string, userId: string) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
        headers: toAuthorization(token)
      }).then(parseResponse<{ ok: true }>);
      setMessage("项目成员已移除。");
      await loadProjectWorkspace(projectId);
    },
    async saveProjectTree(
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
    ) {
      if (!token) return;
      const payload = await fetch(`${apiBase}/projects/${projectId}/tree`, {
        method: "PUT",
        headers: toAuthorization(token),
        body: JSON.stringify({ nodes })
      }).then(parseResponse<ProjectTreeNode[]>);
      setProjectTree(payload);
      setMessage("项目树已保存。");
      await loadProjectWorkspace(projectId);
    },
    async createProjectTreeSnapshot(projectId: string) {
      if (!token) return;
      const snapshot = await fetch(`${apiBase}/projects/${projectId}/tree/snapshot`, {
        method: "POST",
        headers: toAuthorization(token)
      }).then(parseResponse<ProjectTreeSnapshot>);
      setProjectTreeSnapshots((current) => [snapshot, ...current]);
      setMessage(`已生成快照 v${snapshot.version}，包含 ${snapshot.nodes.length} 个节点。`);
    },
    async createProgress(payload: { projectId: string; title: string; content: string }) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${payload.projectId}/progress`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify({ title: payload.title, content: payload.content })
      }).then(parseResponse<ProgressReport>);
      setMessage("进度纪要已提交。");
      await loadProjectWorkspace(payload.projectId);
    },
    async createProjectReport(payload: {
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
    }) {
      if (!token) return;
      await fetch(`${apiBase}/projects/${payload.projectId}/reports`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify(payload)
      }).then(parseResponse<ProgressReport>);
      setMessage("结构化汇报已提交。");
      await loadProjectWorkspace(payload.projectId);
    },
    async loadProjectReportDetail(projectId: string, reportId: string) {
      if (!token) return;
      const payload = await fetch(`${apiBase}/projects/${projectId}/reports/${reportId}`, {
        headers: toAuthorization(token)
      }).then(parseResponse<ProjectReportDetail>);
      setProjectReportDetail(payload);
    },
    async updateContact(phone: string) {
      if (!token) return;
      const payload = await fetch(`${apiBase}/auth/profile/contact`, {
        method: "PATCH",
        headers: toAuthorization(token),
        body: JSON.stringify({ phone })
      }).then(parseResponse<ManagedUser>);
      setProfile(payload);
      setMessage("联系方式已更新。");
    },
    async changePassword(currentPassword: string, newPassword: string) {
      if (!token) return;
      await fetch(`${apiBase}/auth/profile/password`, {
        method: "PATCH",
        headers: toAuthorization(token),
        body: JSON.stringify({ currentPassword, newPassword })
      }).then(parseResponse<{ ok: true }>);
      setMessage("密码已修改。");
    },
    async registerUser(payload: {
      username: string;
      password: string;
      identityType: "student_no" | "employee_no";
      identityNo: string;
      displayName: string;
      role: Actor["role"];
    }) {
      if (!token) return;
      await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: toAuthorization(token),
        body: JSON.stringify(payload)
      }).then(parseResponse<Actor>);
      setMessage("新成员账号已创建。");
      await refreshAll();
    },
    async resetUserPassword(userId: string, newPassword: string) {
      if (!token) return;
      await fetch(`${apiBase}/auth/users/${userId}/password`, {
        method: "PATCH",
        headers: toAuthorization(token),
        body: JSON.stringify({ newPassword })
      }).then(parseResponse<{ ok: true }>);
      setMessage("成员密码已重置。");
    },
    async updateUserRole(userId: string, role: Actor["role"]) {
      if (!token) return;
      await fetch(`${apiBase}/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: toAuthorization(token),
        body: JSON.stringify({ role })
      }).then(parseResponse<ManagedUser>);
      setMessage("成员角色已更新。");
      await refreshAll();
    },
    async deleteUser(userId: string) {
      if (!token) return;
      await fetch(`${apiBase}/auth/users/${userId}`, {
        method: "DELETE",
        headers: toAuthorization(token)
      }).then(parseResponse<{ ok: true }>);
      setMessage("成员已停用。");
      await refreshAll();
    }
  };
}
