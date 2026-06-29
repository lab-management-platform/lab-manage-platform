import { Bell, FileText, LogOut, XCircle } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LoginForm } from "./LoginForm";
import { Sidebar } from "./Sidebar";
import { InventoryPanel } from "./InventoryPanel";
import { FilePanel } from "./FilePanel";
import { MeetingPanel } from "./MeetingPanel";
import { AccountPanel } from "./AccountPanel";
import { AIPanel } from "./AIPanel";
import { ProjectsPanel } from "./ProjectsPanel";
import { ModuleCard } from "./Shared";

import type {
  Actor,
  ChatHistoryRecord,
  ChatMessage,
  ChatResponse,
  FaqTemplate,
  FileCategory,
  FileNodeType,
  FileVersion,
  FileVisibility,
  InventoryApplication,
  KnowledgeDocument,
  KnowledgeSource,
  LabFile,
  ManagedUser,
  Material,
  Meeting,
  NotificationItem,
  StockMovement,
  Summary
} from "../types";

import {
  accountPreviewLimit,
  apiBase,
  applicationPreviewLimit,
  defaultResetPassword,
  notificationTypeText,
  phonePattern,
  roleText,
  toDatetimeLocal
} from "../utils/helpers";

export function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("lab_token") ?? "");
  const [actor, setActor] = useState<Actor | null>(() => {
    const raw = sessionStorage.getItem("lab_actor");
    return raw ? (JSON.parse(raw) as Actor) : null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [applications, setApplications] = useState<InventoryApplication[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [files, setFiles] = useState<LabFile[]>([]);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [profile, setProfile] = useState<ManagedUser | null>(null);
  const [summary, setSummary] = useState<Summary>({
    materialCount: 0,
    lowStockCount: 0,
    pendingApplications: 0,
    approvedApplications: 0
  });
  const [selectedMaterialId, setSelectedMaterialId] = useState("m-001");
  const [quantity, setQuantity] = useState(1);
  const [stockInQuantity, setStockInQuantity] = useState(5);
  const [reason, setReason] = useState("课题实验耗材申请");
  const [message, setMessage] = useState("请登录后开始使用。");
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetResult, setResetResult] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerStudentId, setRegisterStudentId] = useState("");
  const [registerDisplayName, setRegisterDisplayName] = useState("");
  const [registerRole, setRegisterRole] = useState<"admin" | "member">("member");
  const [accountTab, setAccountTab] = useState<
    "profile" | "security" | "list" | "roles" | "register"
  >("profile");
  const [userSearch, setUserSearch] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showAllApplications, setShowAllApplications] = useState(false);
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  const [movementMaterialFilter, setMovementMaterialFilter] = useState("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");
  const [fileSearch, setFileSearch] = useState("");
  const [fileParentId, setFileParentId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [fileTitle, setFileTitle] = useState("实验记录模板");
  const [fileCategory, setFileCategory] = useState<FileCategory>("template");
  const [fileNodeType, setFileNodeType] = useState<FileNodeType>("file");
  const [fileVisibility, setFileVisibility] = useState<FileVisibility>("public");
  const [fileTags, setFileTags] = useState("模板,实验记录");
  const [fileDriveUrl, setFileDriveUrl] = useState("https://drive.example.local/shared/template");
  const [fileDescription, setFileDescription] = useState("Synology Drive 共享链接");
  const [fileUploadName, setFileUploadName] = useState("");
  const [fileUploadMimeType, setFileUploadMimeType] = useState("");
  const [fileUploadSize, setFileUploadSize] = useState(0);
  const [fileUploadBase64, setFileUploadBase64] = useState("");
  const [versionNote, setVersionNote] = useState("更新资料版本");
  const [meetingTitle, setMeetingTitle] = useState("课题组周会");
  const [meetingStartsAt, setMeetingStartsAt] = useState(() =>
    toDatetimeLocal(new Date(Date.now() + 1000 * 60 * 60 * 24))
  );
  const [meetingEndsAt, setMeetingEndsAt] = useState(() =>
    toDatetimeLocal(new Date(Date.now() + 1000 * 60 * 60 * 25))
  );
  const [meetingLocation, setMeetingLocation] = useState("实验室会议室");
  const [meetingOnlineUrl, setMeetingOnlineUrl] = useState("");
  const [meetingParticipants, setMeetingParticipants] = useState("");
  const [meetingSummary, setMeetingSummary] = useState("同步本周实验进展与耗材申请。");
  const [announcementTitle, setAnnouncementTitle] = useState("实验室通知");
  const [announcementContent, setAnnouncementContent] = useState("请及时查看本周会议安排。");
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSources, setAiSources] = useState<KnowledgeSource[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [faqTemplates, setFaqTemplates] = useState<FaqTemplate[]>([]);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("general");
  const [knowledgeTags, setKnowledgeTags] = useState("");
  const [editingKnowledgeId, setEditingKnowledgeId] = useState("");
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [aiActiveTab, setAiActiveTab] = useState<"chat" | "knowledge">("chat");
  const [projectList, setProjectList] = useState<Array<{id:string;name:string;description:string;ownerId:string;ownerName:string;status:string;startsAt?:string;endsAt?:string;createdAt:string}>>([]);
  const [projectTasks, setProjectTasks] = useState<Array<{id:string;projectId:string;title:string;description:string;assigneeId?:string;assigneeName?:string;priority:string;status:string;dueDate?:string}>>([]);
  const [projectProgress, setProjectProgress] = useState<Array<{id:string;projectId:string;authorId:string;authorName:string;title:string;content:string;createdAt:string}>>([]);
  const [projectMembers, setProjectMembers] = useState<Array<{userId:string;userName:string;memberRole:string;joinedAt:string}>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [progressTitle, setProgressTitle] = useState("");
  const [progressContent, setProgressContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const didMountToast = useRef(false);

  const canApprove = actor?.permissions.includes("inventory:approve") ?? false;
  const canStock = actor?.permissions.includes("inventory:stock") ?? false;
  const canManageUsers = actor?.permissions.includes("user:write") ?? false;
  const canManageFiles = actor?.permissions.includes("file:write") ?? false;
  const canManageMeetings = actor?.permissions.includes("meeting:write") ?? false;

  function headers(activeToken = token) {
    return {
      Authorization: `Bearer ${activeToken}`,
      "Content-Type": "application/json"
    };
  }

  function scrollToNotifications() {
    document
      .getElementById("notifications")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function login(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "登录失败");
      }

      setToken(payload.token);
      setActor(payload.actor);
      sessionStorage.setItem("lab_token", payload.token);
      sessionStorage.setItem("lab_actor", JSON.stringify(payload.actor));
      setMessage(`欢迎回来，${payload.actor.displayName}`);
      await loadData(payload.token);
      await loadProfile(payload.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  // ── Project handlers ──────────────────────────────────
  async function loadProjects() {
    if (!token) return;
    try {
      const r = await fetch(`${apiBase}/projects`, { headers: headers() });
      if (!r.ok) { console.error("loadProjects failed:", r.status); return; }
      const data = await r.json();
      setProjectList(data);
    } catch (e) { console.error("loadProjects error:", e); }
  }

  async function loadProjectData(projectId: string) {
    if (!token || !projectId) { setProjectTasks([]); setProjectProgress([]); setProjectMembers([]); return; }
    try {
      const [tR, pR, mR] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/tasks`, { headers: headers() }),
        fetch(`${apiBase}/projects/${projectId}/progress`, { headers: headers() }),
        fetch(`${apiBase}/projects/${projectId}/members`, { headers: headers() }),
      ]);
      if (tR.ok) setProjectTasks(await tR.json());
      if (pR.ok) setProjectProgress(await pR.json());
      if (mR.ok) setProjectMembers(await mR.json());
    } catch {}
  }

  async function handleCreateProject(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setLoading(true);
    try {
      await fetch(`${apiBase}/projects`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });
      setNewProjectName(""); setNewProjectDesc("");
      await loadProjects();
    } catch {} finally { setLoading(false); }
  }

  async function handleUploadProgress(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProjectId || !progressTitle.trim()) return;
    setLoading(true);
    try {
      await fetch(`${apiBase}/projects/${selectedProjectId}/progress`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ title: progressTitle, content: progressContent })
      });
      setProgressTitle(""); setProgressContent("");
      await loadProjectData(selectedProjectId);
    } catch {} finally { setLoading(false); }
  }

  async function handleCreateTask(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProjectId || !taskTitle.trim()) return;
    setLoading(true);
    try {
      await fetch(`${apiBase}/projects/${selectedProjectId}/tasks`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ title: taskTitle, assigneeId: taskAssignee || undefined, priority: taskPriority })
      });
      setTaskTitle(""); setTaskAssignee("");
      await loadProjectData(selectedProjectId);
    } catch {} finally { setLoading(false); }
  }

  async function handleApproveProject(projectId: string) {
    try {
      await fetch(`${apiBase}/projects/${projectId}`, {
        method: "PATCH", headers: headers(),
        body: JSON.stringify({ status: "active" })
      });
      await loadProjects();
      if (selectedProjectId === projectId) loadProjectData(projectId);
    } catch {}
  }

  async function handleCompleteTask(taskId: string) {
    try {
      await fetch(`${apiBase}/projects/${selectedProjectId}/tasks/${taskId}`, {
        method: "PATCH", headers: headers(),
        body: JSON.stringify({ status: "done" })
      });
      await loadProjectData(selectedProjectId);
    } catch {}
  }

  // Init project data
  useEffect(() => { if (token) loadProjects(); }, [token]);
  useEffect(() => { if (selectedProjectId) loadProjectData(selectedProjectId); }, [selectedProjectId, token]);

  async function handleForgotPassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResetResult("");
    try {
      const response = await fetch(`${apiBase}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: resetIdentifier, phone: resetPhone })
      });
      const payload = await response.json();
      if (!response.ok) {
        setResetResult(payload.error ?? "验证失败，请检查信息后重试。");
      } else {
        setResetResult(`密码已重置，新密码: ${payload.newPassword}。请返回登录页面使用新密码登录，登录后请尽快修改密码。`);
      }
    } catch {
      setResetResult("服务暂不可用，请联系实验室管理员。");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken("");
    setActor(null);
    sessionStorage.removeItem("lab_token");
    sessionStorage.removeItem("lab_actor");
    setMessage("已退出登录。");
  }

  async function loadData(activeToken = token) {
    if (!activeToken) {
      return;
    }

    const [summaryResponse, materialsResponse, applicationsResponse, movementsResponse] =
      await Promise.all([
        fetch(`${apiBase}/inventory/summary`, { headers: headers(activeToken) }),
        fetch(`${apiBase}/inventory/materials`, { headers: headers(activeToken) }),
        fetch(`${apiBase}/inventory/applications`, { headers: headers(activeToken) }),
        fetch(`${apiBase}/inventory/stock-movements`, { headers: headers(activeToken) })
      ]);

    if (
      !summaryResponse.ok ||
      !materialsResponse.ok ||
      !applicationsResponse.ok ||
      !movementsResponse.ok
    ) {
      throw new Error("数据加载失败，请确认 API 容器正在运行或重新登录。");
    }

    setSummary(await summaryResponse.json());
    setMaterials(await materialsResponse.json());
    setApplications(await applicationsResponse.json());
    setStockMovements(await movementsResponse.json());
  }

  async function loadUsers(
    search = userSearch,
    activeToken = token,
    includeInactive = showInactiveAccounts
  ) {
    if (!activeToken || !canManageUsers) {
      return;
    }

    const response = await fetch(
      `${apiBase}/auth/users?search=${encodeURIComponent(search)}&includeInactive=${includeInactive}`,
      {
        headers: headers(activeToken)
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "账号列表加载失败");
    }
    setUsers(payload);
  }

  async function loadProfile(activeToken = token) {
    if (!activeToken) {
      return;
    }

    const response = await fetch(`${apiBase}/auth/profile`, {
      headers: headers(activeToken)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "个人资料加载失败");
    }
    setProfile(payload);
    setContactPhone(payload.phone ?? "");
  }

  async function loadFiles(search = fileSearch, activeToken = token) {
    if (!activeToken) {
      return;
    }

    const params = new URLSearchParams();
    if (search) {
      params.set("search", search);
    }
    const response = await fetch(`${apiBase}/files?${params.toString()}`, {
      headers: headers(activeToken)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "文件资料加载失败");
    }
    setFiles(payload);
  }

  async function loadFileVersions(fileId = selectedFileId, activeToken = token) {
    if (!activeToken || !fileId) {
      setFileVersions([]);
      return;
    }

    const response = await fetch(`${apiBase}/files/${fileId}/versions`, {
      headers: headers(activeToken)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "文件版本加载失败");
    }
    setFileVersions(payload);
  }

  async function loadMeetings(activeToken = token) {
    if (!activeToken) {
      return;
    }

    const response = await fetch(`${apiBase}/meetings`, {
      headers: headers(activeToken)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "会议列表加载失败");
    }
    setMeetings(payload);
  }

  async function loadNotifications(activeToken = token) {
    if (!activeToken) {
      return;
    }

    const response = await fetch(`${apiBase}/notifications`, {
      headers: headers(activeToken)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "通知加载失败");
    }
    setNotifications(payload);
  }

  useEffect(() => {
    loadData().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "系统连接失败");
    });
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const refresh = () => {
      loadData(token).catch(() => {
        // Background refresh should not interrupt the user's current workflow.
      });
      loadProfile(token).catch(() => {
        // Profile refresh is best-effort for background updates.
      });
      loadFiles(fileSearch, token).catch(() => {
        // File refresh is best-effort for background updates.
      });
      loadMeetings(token).catch(() => {
        // Meeting refresh is best-effort for background updates.
      });
      loadNotifications(token).catch(() => {
        // Notification refresh is best-effort for background updates.
      });
      loadProjects().catch(() => {
        // Project refresh is best-effort for background updates.
      });
    };
    refresh();
    const eventSource = new EventSource(`${apiBase}/events?token=${encodeURIComponent(token)}`);
    eventSource.addEventListener("domain-event", refresh);
    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      eventSource.close();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token, fileSearch, fileParentId]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadFiles().catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "文件资料加载失败");
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [fileSearch, fileParentId, token]);

  useEffect(() => {
    if (!selectedFileId || !token) {
      setFileVersions([]);
      return;
    }

    loadFileVersions().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "文件版本加载失败");
    });
  }, [selectedFileId, token]);

  useEffect(() => {
    if (!canManageUsers) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAllAccounts(false);
      loadUsers().catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "账号列表加载失败");
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [canManageUsers, userSearch, token, showInactiveAccounts]);

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projectList) map[p.id] = p.name;
    return map;
  }, [projectList]);

  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === selectedMaterialId),
    [materials, selectedMaterialId]
  );

  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  );
  const visibleApplications = canApprove
    ? applications
    : applications.filter((application) => application.applicantId === actor?.id);
  const displayedApplications = showAllApplications
    ? visibleApplications
    : visibleApplications.slice(0, applicationPreviewLimit);
  const hasMoreApplications = visibleApplications.length > applicationPreviewLimit;
  const displayedUsers = showAllAccounts ? users : users.slice(0, accountPreviewLimit);
  const hasMoreUsers = users.length > accountPreviewLimit;
  const filteredStockMovements = stockMovements.filter((movement) => {
    const matchesMaterial =
      movementMaterialFilter === "all" || movement.materialId === movementMaterialFilter;
    const matchesType = movementTypeFilter === "all" || movement.type === movementTypeFilter;
    return matchesMaterial && matchesType;
  });
  const currentFolders = files.filter(
    (file) => file.nodeType === "folder" && (file.parentId ?? "") === fileParentId
  );
  const currentFileItems = files.filter(
    (file) => file.nodeType === "file" && (file.parentId ?? "") === fileParentId
  );
  const selectedFile = files.find((file) => file.id === selectedFileId);
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);

  useEffect(() => {
    if (!token) return;
    loadAiChatHistory();
    loadKnowledgeDocs();
    loadFaqTemplatesList();
  }, [token]);

  useEffect(() => {
    if (!didMountToast.current) {
      didMountToast.current = true;
      return;
    }

    if (!message) {
      return;
    }

    setShowToast(true);
    const timer = window.setTimeout(() => setShowToast(false), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function submitApplication(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/inventory/applications`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          materialId: selectedMaterialId,
          quantity,
          reason,
          projectId: selectedProjectId || undefined
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "申请提交失败");
      }

      setMessage(`申请已提交：${payload.materialName} x ${payload.quantity}`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "申请提交失败");
    } finally {
      setLoading(false);
    }
  }

  async function stockInMaterial() {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBase}/inventory/materials/${selectedMaterialId}/stock-in`,
        {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({
            quantity: stockInQuantity,
            remark: "管理员入库登记"
          })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "入库失败");
      }
      setMessage(`${payload.name} 已入库 ${stockInQuantity}${payload.unit}`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "入库失败");
    } finally {
      setLoading(false);
    }
  }

  async function reviewApplication(id: string, action: "approve" | "reject") {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/inventory/applications/${id}/${action}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          remark: action === "approve" ? "库存确认无误，批准领用。" : "请补充实验说明后重新提交。"
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "审批失败");
      }
      setApplications((current) =>
        current.map((application) => (application.id === id ? payload : application))
      );
      setSummary((current) => ({
        ...current,
        pendingApplications: Math.max(0, current.pendingApplications - 1),
        approvedApplications:
          action === "approve" ? current.approvedApplications + 1 : current.approvedApplications
      }));
      if (action === "approve") {
        setMaterials((current) =>
          current.map((material) =>
            material.id === payload.materialId
              ? { ...material, stock: material.stock - payload.quantity }
              : material
          )
        );
      }
      setMessage(action === "approve" ? "已批准申请并扣减库存。" : "已拒绝申请。");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "审批失败");
    } finally {
      setLoading(false);
    }
  }

  async function registerUser(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          username: registerUsername,
          password: registerPassword,
          studentId: registerStudentId,
          displayName: registerDisplayName,
          role: registerRole
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "注册失败");
      }

      setMessage(`已创建账号：${payload.displayName} / ${payload.username}`);
      setRegisterUsername("");
      setRegisterPassword("");
      setRegisterStudentId("");
      setRegisterDisplayName("");
      setRegisterRole("member");
      setAccountTab("list");
      await loadUsers("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  async function updateContact(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phonePattern.test(contactPhone)) {
      setMessage("手机号格式不正确，请填写 11 位中国大陆手机号，例如 13800000000。");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/profile/contact`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ phone: contactPhone })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "手机号更新失败");
      }
      setProfile(payload);
      setContactPhone(payload.phone ?? "");
      setMessage("绑定手机已更新。");
      if (canManageUsers) {
        await loadUsers();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "手机号更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("请完整填写当前密码、新密码和确认新密码。");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("新密码至少需要 8 位。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("两次输入的新密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/profile/password`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "密码修改失败");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("密码已修改，下次登录请使用新密码。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "密码修改失败");
    } finally {
      setLoading(false);
    }
  }

  async function resetUserPassword(user: ManagedUser) {
    const confirmed = window.confirm(
      `确认将 ${user.displayName} 的密码重置为 ${defaultResetPassword}？`
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/users/${user.id}/password`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ newPassword: defaultResetPassword })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "重置密码失败");
      }
      setMessage(`已重置 ${user.displayName} 的密码。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重置密码失败");
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(user: ManagedUser, role: "admin" | "member") {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/users/${user.id}/role`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ role })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "角色更新失败");
      }
      setUsers((current) => current.map((item) => (item.id === user.id ? payload : item)));
      setMessage(`已将 ${user.displayName} 设置为${roleText(role)}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "角色更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function registerFile(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/files`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          nodeType: fileNodeType,
          title: fileTitle,
          category: fileCategory,
          parentId: fileParentId || undefined,
          tags: fileTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          visibility: fileVisibility,
          driveUrl: fileDriveUrl || undefined,
          description: fileDescription,
          projectId: selectedProjectId || undefined,
          originalName: fileUploadName || undefined,
          mimeType: fileUploadMimeType || undefined,
          sizeBytes: fileUploadSize || undefined,
          contentBase64: fileUploadBase64 || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "文件登记失败");
      }
      setMessage(
        `${fileNodeType === "folder" ? "已创建文件夹" : "已登记文件资料"}：${payload.title}`
      );
      setFileTitle("");
      setFileDriveUrl("");
      setFileDescription("");
      setFileTags("");
      setFileUploadName("");
      setFileUploadMimeType("");
      setFileUploadSize(0);
      setFileUploadBase64("");
      setFileCategory("template");
      setFileNodeType("file");
      setSelectedFileId(payload.id);
      await loadFiles("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文件登记失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileContentChange(file: File | null) {
    if (!file) {
      setFileUploadName("");
      setFileUploadMimeType("");
      setFileUploadSize(0);
      setFileUploadBase64("");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("当前 MVP 支持 5MB 以内小文件直传；大文件请先使用 NAS 链接登记。");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });
    setFileUploadName(file.name);
    setFileUploadMimeType(file.type || "application/octet-stream");
    setFileUploadSize(file.size);
    setFileUploadBase64(dataUrl.split(",")[1] ?? "");
    if (!fileTitle.trim()) {
      setFileTitle(file.name);
    }
  }

  async function addFileVersion(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFileId) {
      setMessage("请先选择一个文件。");
      return;
    }
    if (!fileUploadBase64 && !fileDriveUrl) {
      setMessage("请上传小文件或填写 NAS 链接。");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/files/${selectedFileId}/versions`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          originalName: fileUploadName || selectedFile?.originalName || "file.link",
          mimeType: fileUploadMimeType || selectedFile?.mimeType || "text/uri-list",
          sizeBytes: fileUploadSize || 0,
          contentBase64: fileUploadBase64 || undefined,
          driveUrl: fileDriveUrl || undefined,
          changeNote: versionNote
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "版本更新失败");
      }
      setMessage(`已新增版本：v${payload.version}`);
      setFileUploadName("");
      setFileUploadMimeType("");
      setFileUploadSize(0);
      setFileUploadBase64("");
      setFileDriveUrl("");
      await loadFiles();
      await loadFileVersions(selectedFileId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "版本更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function downloadFileVersion(version: FileVersion) {
    const response = await fetch(
      `${apiBase}/files/${version.fileId}/versions/${version.id}/download`,
      { headers: headers() }
    );
    const payload = (await response.json()) as FileVersion & { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "下载失败");
      return;
    }
    if (payload.driveUrl && !payload.contentBase64) {
      window.open(payload.driveUrl, "_blank", "noreferrer");
      return;
    }
    if (!payload.contentBase64) {
      setMessage("该版本没有可下载内容。");
      return;
    }
    const byteCharacters = atob(payload.contentBase64);
    const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
    const blob = new Blob([new Uint8Array(byteNumbers)], {
      type: payload.mimeType || "application/octet-stream"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = payload.originalName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteUser(user: ManagedUser) {
    const confirmed = window.confirm(`确认删除学员 ${user.displayName}？该账号将无法登录。`);
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/users/${user.id}`, {
        method: "DELETE",
        headers: headers()
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "删除学员失败");
      }
      setMessage(`已删除学员：${user.displayName}`);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除学员失败");
    } finally {
      setLoading(false);
    }
  }

  async function createMeeting(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/meetings`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: meetingTitle,
          startsAt: new Date(meetingStartsAt).toISOString(),
          endsAt: new Date(meetingEndsAt).toISOString(),
          location: meetingLocation,
          onlineUrl: meetingOnlineUrl || undefined,
          participantIds: meetingParticipants
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          summary: meetingSummary,
          projectId: selectedProjectId || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "会议创建失败");
      }
      setMessage(`已创建会议：${payload.title}`);
      await loadMeetings();
      await loadNotifications();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "会议创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function completeMeeting(meeting: Meeting) {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/meetings/${meeting.id}/minutes`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          summary: `${meeting.summary}\n纪要：会议已完成，纪要文件可在文件资料模块登记后关联。`,
          status: "completed"
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "会议更新失败");
      }
      setMeetings((current) => current.map((item) => (item.id === meeting.id ? payload : item)));
      setMessage("会议已标记完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "会议更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function publishAnnouncement(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/announcements`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "公告发布失败");
      }
      setMessage("公告已发布。");
      await loadNotifications();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "公告发布失败");
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationRead(notification: NotificationItem) {
    try {
      const response = await fetch(`${apiBase}/notifications/${notification.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "通知更新失败");
      }
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? payload : item))
      );
      setSelectedNotification((current) => (current?.id === payload.id ? payload : current));
      setMessage(`已读：${payload.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知更新失败");
    }
  }

  async function sendAiMessage(event?: SyntheticEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = aiMessage.trim();
    if (!message || aiLoading) return;

    setAiMessage("");
    setAiError("");
    const userMsg: ChatMessage = { role: "user", content: message };
    setAiChatMessages((prev) => [...prev, userMsg]);
    setAiLoading(true);

    try {
      const response = await fetch(`${apiBase}/ai/chat`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ message })
      });
      const payload = (await response.json()) as ChatResponse & { error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "AI 请求失败");
      }

      const assistantMsg: ChatMessage = { role: "assistant", content: payload.reply };
      setAiChatMessages((prev) => [...prev, assistantMsg]);
      setAiSources(payload.sources ?? []);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "AI 服务连接失败";
      setAiError(errMsg);
    } finally {
      setAiLoading(false);
    }
  }

  async function clearAiHistory() {
    try {
      await fetch(`${apiBase}/ai/chat-history`, {
        method: "DELETE",
        headers: headers()
      });
      setAiChatMessages([]);
      setAiSources([]);
      setAiError("");
      setMessage("对话历史已清除。");
    } catch {
      setMessage("清除历史失败。");
    }
  }

  async function loadAiChatHistory() {
    try {
      const response = await fetch(`${apiBase}/ai/chat-history`, {
        headers: headers()
      });
      if (!response.ok) return;
      const history = (await response.json()) as ChatHistoryRecord[];
      setAiChatMessages(history.map((h) => ({ role: h.role, content: h.content })));
    } catch {
      // Best-effort background load
    }
  }

  async function loadKnowledgeDocs() {
    try {
      const response = await fetch(`${apiBase}/ai/knowledge`, { headers: headers() });
      if (!response.ok) return;
      setKnowledgeDocs(await response.json());
    } catch {
      // Best-effort
    }
  }

  async function loadFaqTemplatesList() {
    try {
      const response = await fetch(`${apiBase}/ai/templates`, { headers: headers() });
      if (!response.ok) return;
      setFaqTemplates(await response.json());
    } catch {
      // Best-effort
    }
  }

  async function createKnowledgeDoc(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!knowledgeTitle.trim() || !knowledgeContent.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch(`${apiBase}/ai/knowledge`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: knowledgeTitle,
          content: knowledgeContent,
          category: knowledgeCategory,
          tags: knowledgeTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "添加知识库失败");
      setMessage(`已添加知识文档：${payload.title}`);
      setKnowledgeTitle("");
      setKnowledgeContent("");
      setKnowledgeTags("");
      await loadKnowledgeDocs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "添加失败");
    } finally {
      setAiLoading(false);
    }
  }

  async function updateKnowledgeDoc(id: string) {
    if (!knowledgeTitle.trim() || !knowledgeContent.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch(`${apiBase}/ai/knowledge/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          title: knowledgeTitle,
          content: knowledgeContent,
          category: knowledgeCategory,
          tags: knowledgeTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "更新知识库失败");
      setMessage(`已更新知识文档：${payload.title}`);
      setEditingKnowledgeId("");
      setKnowledgeTitle("");
      setKnowledgeContent("");
      setKnowledgeCategory("general");
      setKnowledgeTags("");
      await loadKnowledgeDocs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    } finally {
      setAiLoading(false);
    }
  }

  async function deleteKnowledgeDoc(id: string) {
    if (!window.confirm("确认删除该知识库文档？")) return;
    try {
      const response = await fetch(`${apiBase}/ai/knowledge/${id}`, {
        method: "DELETE",
        headers: headers()
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "删除失败");
      }
      setMessage("知识文档已删除。");
      if (editingKnowledgeId === id) {
        setEditingKnowledgeId("");
        setKnowledgeTitle("");
        setKnowledgeContent("");
      }
      await loadKnowledgeDocs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    }
  }

  function startEditKnowledge(doc: KnowledgeDocument) {
    setEditingKnowledgeId(doc.id);
    setKnowledgeTitle(doc.title);
    setKnowledgeContent(doc.content);
    setKnowledgeCategory(doc.category);
    setKnowledgeTags(doc.tags.join(", "));
    setShowKnowledgePanel(true);
  }

  function useFaqTemplate(question: string) {
    setAiMessage(question);
    setAiActiveTab("chat");
  }

  if (!actor) {
    return (
      <LoginForm
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        loading={loading}
        message={message}
        resetMode={resetMode}
        setResetMode={setResetMode}
        resetIdentifier={resetIdentifier}
        setResetIdentifier={setResetIdentifier}
        resetPhone={resetPhone}
        setResetPhone={setResetPhone}
        resetResult={resetResult}
        onSubmit={login}
        onResetPassword={handleForgotPassword}
      />
    );
  }

  return (
    <main className="app-shell">
      <Sidebar actor={actor} />

      <section className="workspace">
        {showToast ? (
          <div className="toast" role="status" aria-live="polite">
            <Bell size={16} />
            {message}
          </div>
        ) : null}

        <header className="topbar">
          <div>
            <p className="eyebrow">今日实验室运营</p>
            <h1>耗材申请与审批工作台</h1>
            <label className="project-context">
              当前项目：
              <select value={selectedProjectId} onChange={(e) => {
                setSelectedProjectId(e.target.value);
                if (e.target.value) loadProjectData(e.target.value);
              }}>
                {actor?.role !== "student" ? <option value="">全部视角</option> : null}
                {projectList.length === 0 ? <option value="">暂无项目</option> : null}
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>{p.status === "pending" ? "⏳ " : ""}{p.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="top-actions">
            <button className="notice notice-button" type="button" onClick={scrollToNotifications}>
              <Bell size={17} />
              {unreadNotifications.length} 条未读 · 查看通知
            </button>
            <button className="ghost" onClick={logout}>
              <LogOut size={17} />
              退出
            </button>
          </div>
        </header>

        <InventoryPanel
          summary={summary}
          materials={materials}
          selectedMaterialId={selectedMaterialId}
          setSelectedMaterialId={setSelectedMaterialId}
          selectedMaterial={selectedMaterial}
          quantity={quantity}
          setQuantity={setQuantity}
          reason={reason}
          setReason={setReason}
          loading={loading}
          canApprove={canApprove}
          canStock={canStock}
          stockInQuantity={stockInQuantity}
          setStockInQuantity={setStockInQuantity}
          displayedApplications={displayedApplications}
          pendingApplications={pendingApplications}
          visibleApplications={visibleApplications}
          hasMoreApplications={hasMoreApplications}
          showAllApplications={showAllApplications}
          setShowAllApplications={setShowAllApplications}
          filteredStockMovements={filteredStockMovements}
          movementMaterialFilter={movementMaterialFilter}
          setMovementMaterialFilter={setMovementMaterialFilter}
          movementTypeFilter={movementTypeFilter}
          setMovementTypeFilter={setMovementTypeFilter}
          onSubmitApplication={submitApplication}
          onStockIn={stockInMaterial}
          onReviewApplication={reviewApplication}
          projectMap={projectMap}
        />

        <FilePanel
          files={files}
          fileSearch={fileSearch}
          setFileSearch={setFileSearch}
          fileParentId={fileParentId}
          setFileParentId={setFileParentId}
          selectedFileId={selectedFileId}
          setSelectedFileId={setSelectedFileId}
          fileVersions={fileVersions}
          currentFolders={currentFolders}
          currentFileItems={currentFileItems}
          selectedFile={selectedFile}
          canManageFiles={canManageFiles}
          loading={loading}
          fileNodeType={fileNodeType}
          setFileNodeType={setFileNodeType}
          fileTitle={fileTitle}
          setFileTitle={setFileTitle}
          fileCategory={fileCategory}
          setFileCategory={setFileCategory}
          fileVisibility={fileVisibility}
          setFileVisibility={setFileVisibility}
          fileTags={fileTags}
          setFileTags={setFileTags}
          fileDriveUrl={fileDriveUrl}
          setFileDriveUrl={setFileDriveUrl}
          fileDescription={fileDescription}
          setFileDescription={setFileDescription}
          versionNote={versionNote}
          setVersionNote={setVersionNote}
          onFileUpload={handleFileContentChange}
          onRegisterFile={registerFile}
          onAddFileVersion={addFileVersion}
          onDownloadVersion={downloadFileVersion}
        />

        <MeetingPanel
          meetings={meetings}
          notifications={notifications}
          setSelectedNotification={setSelectedNotification}
          unreadNotifications={unreadNotifications}
          canManageMeetings={canManageMeetings}
          loading={loading}
          meetingTitle={meetingTitle}
          setMeetingTitle={setMeetingTitle}
          meetingStartsAt={meetingStartsAt}
          setMeetingStartsAt={setMeetingStartsAt}
          meetingEndsAt={meetingEndsAt}
          setMeetingEndsAt={setMeetingEndsAt}
          meetingLocation={meetingLocation}
          setMeetingLocation={setMeetingLocation}
          meetingOnlineUrl={meetingOnlineUrl}
          setMeetingOnlineUrl={setMeetingOnlineUrl}
          meetingParticipants={meetingParticipants}
          setMeetingParticipants={setMeetingParticipants}
          meetingSummary={meetingSummary}
          setMeetingSummary={setMeetingSummary}
          announcementTitle={announcementTitle}
          setAnnouncementTitle={setAnnouncementTitle}
          announcementContent={announcementContent}
          setAnnouncementContent={setAnnouncementContent}
          onCreateMeeting={createMeeting}
          onCompleteMeeting={completeMeeting}
          onPublishAnnouncement={publishAnnouncement}
          onMarkNotificationRead={markNotificationRead}
        />

        <AccountPanel
          actor={actor}
          canManageUsers={canManageUsers}
          loading={loading}
          profile={profile}
          users={users}
          accountTab={accountTab}
          setAccountTab={setAccountTab}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          contactPhone={contactPhone}
          setContactPhone={setContactPhone}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerStudentId={registerStudentId}
          setRegisterStudentId={setRegisterStudentId}
          registerDisplayName={registerDisplayName}
          setRegisterDisplayName={setRegisterDisplayName}
          registerRole={registerRole}
          setRegisterRole={setRegisterRole}
          displayedUsers={displayedUsers}
          hasMoreUsers={hasMoreUsers}
          showAllAccounts={showAllAccounts}
          setShowAllAccounts={setShowAllAccounts}
          showInactiveAccounts={showInactiveAccounts}
          setShowInactiveAccounts={setShowInactiveAccounts}
          onUpdateContact={updateContact}
          onChangePassword={changePassword}
          onRegisterUser={registerUser}
          onResetUserPassword={resetUserPassword}
          onDeleteUser={deleteUser}
          onUpdateUserRole={updateUserRole}
        />
        <AIPanel
          aiMessage={aiMessage}
          setAiMessage={setAiMessage}
          aiChatMessages={aiChatMessages}
          aiLoading={aiLoading}
          aiError={aiError}
          aiSources={aiSources}
          knowledgeDocs={knowledgeDocs}
          faqTemplates={faqTemplates}
          knowledgeTitle={knowledgeTitle}
          setKnowledgeTitle={setKnowledgeTitle}
          knowledgeContent={knowledgeContent}
          setKnowledgeContent={setKnowledgeContent}
          knowledgeCategory={knowledgeCategory}
          setKnowledgeCategory={setKnowledgeCategory}
          knowledgeTags={knowledgeTags}
          setKnowledgeTags={setKnowledgeTags}
          editingKnowledgeId={editingKnowledgeId}
          setEditingKnowledgeId={setEditingKnowledgeId}
          showKnowledgePanel={showKnowledgePanel}
          setShowKnowledgePanel={setShowKnowledgePanel}
          aiActiveTab={aiActiveTab}
          setAiActiveTab={setAiActiveTab}
          onSendAiMessage={sendAiMessage}
          onClearAiHistory={clearAiHistory}
          onUseFaqTemplate={useFaqTemplate}
          onLoadKnowledgeDocs={loadKnowledgeDocs}
          onCreateKnowledgeDoc={createKnowledgeDoc}
          onUpdateKnowledgeDoc={updateKnowledgeDoc}
          onDeleteKnowledgeDoc={deleteKnowledgeDoc}
          onStartEditKnowledge={startEditKnowledge}
        />
        <ProjectsPanel
          projects={projectList}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          tasks={projectTasks}
          progressReports={projectProgress}
          members={projectMembers}
          role={actor?.role ?? "student"}
          loading={loading}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          newProjectDesc={newProjectDesc}
          setNewProjectDesc={setNewProjectDesc}
          progressTitle={progressTitle}
          setProgressTitle={setProgressTitle}
          progressContent={progressContent}
          setProgressContent={setProgressContent}
          taskTitle={taskTitle}
          setTaskTitle={setTaskTitle}
          taskAssignee={taskAssignee}
          setTaskAssignee={setTaskAssignee}
          taskPriority={taskPriority}
          setTaskPriority={setTaskPriority}
          onCreateProject={handleCreateProject}
          onApproveProject={handleApproveProject}
          onUploadProgress={handleUploadProgress}
          onCreateTask={handleCreateTask}
          onCompleteTask={handleCompleteTask}
        />

        <section className="module-strip">
          <ModuleCard title="项目任务" text="项目、任务、看板入口已预留。" />
          <ModuleCard title="AI 智能问答" text="基于 LLM + RAG，支持知识库问答和对话。" />
          <ModuleCard title="文件资料" text="支持文件夹、权限、标签、小文件直传和版本记录。" />
          <ModuleCard title="会议通知" text="支持会议预约、站内通知和全局公告。" />
        </section>

        {selectedNotification ? (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => setSelectedNotification(null)}
          >
            <article
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-detail-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-head compact">
                <div>
                  <p className="eyebrow">{notificationTypeText(selectedNotification.type)}</p>
                  <h2 id="notification-detail-title">{selectedNotification.title}</h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                >
                  <XCircle size={18} />
                </button>
              </div>
              <p>{selectedNotification.content}</p>
              <small>{new Date(selectedNotification.createdAt).toLocaleString()}</small>
              <div className="row-actions">
                {!selectedNotification.readAt ? (
                  <button type="button" onClick={() => markNotificationRead(selectedNotification)}>
                    标记已读
                  </button>
                ) : (
                  <span className="pill approved">已读</span>
                )}
                <button type="button" onClick={() => setSelectedNotification(null)}>
                  关闭
                </button>
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
