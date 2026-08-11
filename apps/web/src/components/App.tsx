import type { SyntheticEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { LoginForm } from "./LoginForm";
import { OidcLogin } from "./OidcLogin";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { FilesPage } from "./pages/FilesPage";
import { MeetingsPage } from "./pages/MeetingsPage";
import { AiPage } from "./pages/AiPage";
import { AccountsPage } from "./pages/AccountsPage";
import { ErrorBoundary } from "./shared/ErrorBoundary";
import { navItems, type AppView } from "../config/navigation";
import { useLabData } from "../hooks/useLabData";
import { apiBase, normalizeRole } from "../utils/helpers";
import type { Actor } from "../types";
import { actorFromOidcUser, oidcEnabled, oidcManager } from "../auth/oidc";

// 解析 hash 路由：#/<view>[/<projectId>]
function parseHash(): { view: AppView | null; projectId: string } {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [viewRaw, projectIdRaw] = hash.split("/");
  const knownViews = new Set<AppView>(navItems.map((item) => item.id));
  const view = knownViews.has(viewRaw as AppView) ? (viewRaw as AppView) : null;
  return { view, projectId: projectIdRaw ?? "" };
}

function buildHash(view: AppView, projectId: string): string {
  return projectId ? `#/${view}/${projectId}` : `#/${view}`;
}

export function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("lab_token") ?? "");
  const [actor, setActor] = useState<Actor | null>(() => {
    const raw = sessionStorage.getItem("lab_actor");
    return raw ? (JSON.parse(raw) as Actor) : null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const initialHash = parseHash();
  const [activeView, setActiveView] = useState<AppView>(initialHash.view ?? "dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(initialHash.projectId);

  const clearSession = () => {
    setToken("");
    setActor(null);
    setSelectedProjectId("");
    sessionStorage.removeItem("lab_token");
    sessionStorage.removeItem("lab_actor");
  };

  const lab = useLabData(token, actor, clearSession);

  const normalizedRole = actor ? normalizeRole(actor.role) : null;

  const visibleViews = useMemo(() => {
    if (!actor || !normalizedRole) return [];
    return navItems.filter(
      (item) =>
        item.roles.includes(normalizedRole) &&
        (!item.permission || actor.permissions.includes(item.permission))
    );
  }, [actor, normalizedRole]);

  // #6: hash 路由同步 - view/projectId 变化时更新 URL（pushState 保留历史记录）
  useEffect(() => {
    if (!actor) return;
    const expected = buildHash(activeView, selectedProjectId);
    if (window.location.hash !== expected && window.location.hash !== "") {
      window.history.pushState({}, "", expected);
    } else if (window.location.hash === "") {
      // 首次进入：用 replaceState 填充初始 hash，不污染历史
      window.history.replaceState({}, "", expected);
    }
  }, [activeView, selectedProjectId, actor]);

  // #6: 监听浏览器前进/后退
  useEffect(() => {
    if (!actor) return;
    const onHashChange = () => {
      const { view, projectId } = parseHash();
      if (view) {
        setActiveView(view);
        setSelectedProjectId(projectId);
      } else {
        window.history.replaceState({}, "", "#/dashboard");
        setActiveView("dashboard");
        setSelectedProjectId("");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [actor]);

  // #6: 兜底 - 当前 view 不在可见列表时切到首项
  useEffect(() => {
    if (!actor) return;
    if (visibleViews.length === 0) return;
    if (!visibleViews.some((item) => item.id === activeView)) {
      setActiveView(visibleViews[0].id);
    }
  }, [activeView, visibleViews, actor]);

  // #5: 去掉 lab.projects 依赖，只在 actor/projectId 变化时加载
  useEffect(() => {
    if (!actor) return;
    if (selectedProjectId) {
      lab.loadProjectWorkspace(selectedProjectId).catch(() => {
        lab.setMessage("项目数据加载失败,请确认项目是否存在或是否有权限访问");
        setSelectedProjectId("");
      });
      return;
    }
    lab.loadProjectWorkspace("").catch(() => {
      // keep shell responsive
    });
  }, [actor, selectedProjectId]);

  useEffect(() => {
    if (!actor || !lab.message) {
      return;
    }
    const timer = window.setTimeout(() => {
      lab.setMessage("");
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [actor, lab.message, lab.setMessage]);

  // #11: view 和 projectId 变化都滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView, selectedProjectId]);

  useEffect(() => {
    if (!oidcEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const callback = window.location.pathname === "/auth/callback";
        const user = callback ? await oidcManager.signinCallback() : await oidcManager.getUser();
        if (cancelled) return;
        if (user && !user.expired) {
          setToken(user.access_token);
          setActor(actorFromOidcUser(user));
          if (callback) {
            const savedHash = sessionStorage.getItem("oidc_redirect_hash") ?? "";
            sessionStorage.removeItem("oidc_redirect_hash");
            window.history.replaceState({}, "", `/${savedHash}`);
          }
        }
      } catch {
        if (cancelled) return;
        if (window.location.pathname === "/auth/callback") {
          window.history.replaceState({}, "", "/");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // #12: 统一关闭移动端导航
  const openView = (view: AppView) => {
    setActiveView(view);
    setMobileNavOpen(false);
  };

  const selectProject = async (projectId: string, view?: AppView) => {
    setSelectedProjectId(projectId);
    await lab.loadProjectWorkspace(projectId);
    if (view) {
      setActiveView(view);
      setMobileNavOpen(false);
    }
  };

  async function login(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
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
      lab.setMessage(`欢迎回来，${payload.actor.displayName}`);
    } catch (error) {
      lab.setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    clearSession();
    if (oidcEnabled) {
      void oidcManager.signoutRedirect().catch(() => {
        // OIDC 登出跳转失败,本地会话已清理
      });
    }
  }

  if (!actor) {
    if (oidcEnabled) return <OidcLogin />;
    return (
      <LoginForm
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        loading={authLoading}
        message={lab.message}
        onSubmit={login}
      />
    );
  }

  return (
    <main className="app-frame">
      <ErrorBoundary>
      {lab.message ? (
        <div className="toast-layer" aria-live="polite">
          <div className="floating-toast">{lab.message}</div>
        </div>
      ) : null}

      <Sidebar
        actor={actor}
        activeView={activeView}
        onNavigate={openView}
        onToggleMobileNav={() => setMobileNavOpen((current) => !current)}
        mobileNavOpen={mobileNavOpen}
      />

      <section className="workspace-shell">
        <Topbar
          actor={actor}
          projects={lab.projects}
          selectedProjectId={selectedProjectId}
          unreadCount={lab.unreadNotifications.length}
          onOpenView={openView}
          onSelectProject={(projectId) => void selectProject(projectId)}
          onOpenProjectDetail={selectedProjectId ? () => openView("projects") : undefined}
          onLogout={logout}
        />

        <div className="workspace-body">
          {lab.loading ? (
            <div className="loading-bar" aria-live="polite">
              数据加载中…
            </div>
          ) : null}

          {activeView === "dashboard" ? (
            <DashboardPage
              actor={actor}
              actorName={actor.displayName}
              summary={lab.summary}
              projects={lab.projects}
              tasks={lab.projectTasks}
              materials={lab.materials}
              applications={lab.applications}
              notifications={lab.notifications}
              dashboard={lab.dashboard}
              onOpenView={openView}
              onSelectProject={(projectId) => void selectProject(projectId, "projects")}
            />
          ) : null}

          {activeView === "projects" ? (
            <ProjectsPage
              actor={actor}
              projects={lab.projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={(projectId) => void selectProject(projectId)}
              tasks={lab.projectTasks}
              projectNotes={lab.projectNotes}
              progressReports={lab.progressReports}
              projectTree={lab.projectTree}
              projectTreeSnapshots={lab.projectTreeSnapshots}
              members={lab.projectMembers}
              users={lab.users}
              onCreateProject={lab.createProject}
              onApproveProject={lab.approveProject}
              onCreateTask={lab.createTask}
              onCompleteTask={lab.completeTask}
              onAddProjectMember={lab.addProjectMember}
              onUpdateProjectMember={lab.updateProjectMember}
              onRemoveProjectMember={lab.removeProjectMember}
              onCreateProjectNote={lab.createProjectNote}
              onUpdateProjectNote={lab.updateProjectNote}
              onDeleteProjectNote={lab.deleteProjectNote}
              onSaveProjectTree={lab.saveProjectTree}
              onCreateProjectTreeSnapshot={lab.createProjectTreeSnapshot}
              onCreateProjectReport={lab.createProjectReport}
              onLoadProjectReportDetail={lab.loadProjectReportDetail}
              projectReportDetail={lab.projectReportDetail}
            />
          ) : null}

          {activeView === "inventory" ? (
            <InventoryPage
              actor={actor}
              summary={lab.summary}
              categories={lab.inventoryCategories}
              materials={lab.materials}
              applications={lab.applications}
              stockMovements={lab.stockMovements}
              loans={lab.loans}
              projects={lab.projects}
              selectedProjectId={selectedProjectId}
              onSubmitApplication={lab.submitApplication}
              onStockIn={lab.stockIn}
              onReturnLoan={lab.returnLoan}
              onCreateCategory={lab.createInventoryCategory}
              onReviewApplication={lab.reviewApplication}
            />
          ) : null}

          {activeView === "files" ? (
            <FilesPage
              actor={actor}
              projects={lab.projects}
              selectedProjectId={selectedProjectId}
              files={lab.files}
              versions={lab.fileVersions}
              onSelectFile={lab.loadFileVersions}
              onCreateProjectFile={lab.createProjectFile}
              onAddFileVersion={lab.addFileVersion}
            />
          ) : null}

          {activeView === "meetings" ? (
            <MeetingsPage
              actor={actor}
              projects={lab.projects}
              selectedProjectId={selectedProjectId}
              meetings={lab.meetings}
              meetingAttendance={lab.meetingAttendance}
              notifications={lab.notifications}
              onCreateMeeting={lab.createMeeting}
              onUpdateMeetingMinutes={lab.updateMeetingMinutes}
              onUpdateMeetingAttendance={lab.updateMeetingAttendance}
              onPublishAnnouncement={lab.publishAnnouncement}
              onMarkNotificationRead={lab.markNotificationRead}
            />
          ) : null}

          {activeView === "ai" ? (
            <AiPage
              actor={actor}
              messages={lab.aiMessages}
              loading={lab.aiLoading}
              error={lab.aiError}
              sources={lab.aiSources}
              knowledgeDocs={lab.knowledgeDocs}
              faqTemplates={lab.faqTemplates}
              onSendMessage={lab.sendAiMessage}
              onClearHistory={lab.clearAiHistory}
              onCreateKnowledge={lab.createKnowledge}
              onUploadKnowledgeFile={lab.uploadKnowledgeFile}
              onDeleteKnowledge={lab.deleteKnowledge}
            />
          ) : null}

          {activeView === "profile" || activeView === "admin" ? (
            <AccountsPage
              actor={actor}
              profile={lab.profile}
              users={lab.users}
              onUpdateContact={lab.updateContact}
              onChangePassword={lab.changePassword}
              onRegisterUser={lab.registerUser}
              onResetUserPassword={lab.resetUserPassword}
              onUpdateUserRole={lab.updateUserRole}
              onDeleteUser={lab.deleteUser}
            />
          ) : null}

          {activeView === "dashboard" ||
          activeView === "projects" ||
          activeView === "inventory" ||
          activeView === "files" ||
          activeView === "meetings" ||
          activeView === "ai" ||
          activeView === "profile" ||
          activeView === "admin" ? null : (
            <div className="empty-state">
              <h2>页面不存在</h2>
              <p>找不到该页面,请通过侧边栏导航切换。</p>
            </div>
          )}
        </div>
      </section>
      </ErrorBoundary>
    </main>
  );
}
