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
import { navItems, type AppView } from "../config/navigation";
import { useLabData } from "../hooks/useLabData";
import { apiBase } from "../utils/helpers";
import type { Actor } from "../types";
import { actorFromOidcUser, oidcEnabled, oidcManager } from "../auth/oidc";

export function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("lab_token") ?? "");
  const [actor, setActor] = useState<Actor | null>(() => {
    const raw = sessionStorage.getItem("lab_actor");
    return raw ? (JSON.parse(raw) as Actor) : null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetResult, setResetResult] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const lab = useLabData(token, actor);

  const visibleViews = useMemo(() => {
    if (!actor) return [];
    return navItems.filter(
      (item) =>
        item.roles.includes(actor.role) &&
        (!item.permission || actor.permissions.includes(item.permission))
    );
  }, [actor]);

  useEffect(() => {
    if (!visibleViews.some((item) => item.id === activeView)) {
      setActiveView(visibleViews[0]?.id ?? "dashboard");
    }
  }, [activeView, visibleViews]);

  useEffect(() => {
    if (!actor) return;
    if (selectedProjectId) {
      lab.loadProjectWorkspace(selectedProjectId).catch(() => {
        // keep shell responsive
      });
      return;
    }
    lab.loadProjectWorkspace("").catch(() => {
      // keep shell responsive
    });
  }, [actor, selectedProjectId, lab.projects]);

  useEffect(() => {
    if (!actor || !lab.message) {
      return;
    }
    const timer = window.setTimeout(() => {
      lab.setMessage("");
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [actor, lab.message, lab.setMessage]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView]);

  useEffect(() => {
    if (!oidcEnabled) return;
    void (async () => {
      const callback = window.location.pathname === "/auth/callback";
      const user = callback ? await oidcManager.signinCallback() : await oidcManager.getUser();
      if (user && !user.expired) {
        setToken(user.access_token);
        setActor(actorFromOidcUser(user));
        if (callback) window.history.replaceState({}, "", "/");
      }
    })();
  }, []);

  async function loginWithCredentials(loginUsername: string, loginPassword: string) {
    setAuthLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
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

  async function login(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await loginWithCredentials(username, password);
  }

  async function resetPassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void event;
    void resetIdentifier;
    void resetPhone;
    setResetResult("密码重置已迁移到统一身份认证，请联系管理员或使用身份认证中心的找回密码流程。");
  }

  function logout() {
    if (oidcEnabled) {
      void oidcManager.signoutRedirect();
    }
    setToken("");
    setActor(null);
    setSelectedProjectId("");
    sessionStorage.removeItem("lab_token");
    sessionStorage.removeItem("lab_actor");
  }

  if (!actor) {
    if (oidcEnabled) return <OidcLogin onLocalLogin={loginWithCredentials} />;
    return (
      <LoginForm
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        loading={authLoading}
        message={lab.message}
        resetMode={resetMode}
        setResetMode={setResetMode}
        resetIdentifier={resetIdentifier}
        setResetIdentifier={setResetIdentifier}
        resetPhone={resetPhone}
        setResetPhone={setResetPhone}
        resetResult={resetResult}
        onSubmit={login}
        onResetPassword={resetPassword}
      />
    );
  }

  return (
    <main className="app-frame">
      {lab.message ? (
        <div className="toast-layer" aria-live="polite">
          <div className="floating-toast">{lab.message}</div>
        </div>
      ) : null}

      <Sidebar
        actor={actor}
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          setMobileNavOpen(false);
        }}
        onToggleMobileNav={() => setMobileNavOpen((current) => !current)}
        mobileNavOpen={mobileNavOpen}
      />

      <section className="workspace-shell">
        <Topbar
          actor={actor}
          projects={lab.projects}
          selectedProjectId={selectedProjectId}
          unreadCount={lab.unreadNotifications.length}
          onOpenView={(view) => {
            setActiveView(view);
            setMobileNavOpen(false);
          }}
          onSelectProject={async (projectId) => {
            setSelectedProjectId(projectId);
            await lab.loadProjectWorkspace(projectId);
          }}
          onLogout={logout}
        />

        <div className="workspace-body">
          {activeView === "dashboard" ? (
            <DashboardPage
              actor={actor}
              actorName={actor.displayName}
              summary={lab.summary}
              categories={lab.inventoryCategories}
              projects={lab.projects}
              tasks={lab.projectTasks}
              materials={lab.materials}
              applications={lab.applications}
              notifications={lab.notifications}
              dashboard={lab.dashboard}
              onOpenView={(view) => setActiveView(view)}
              onSelectProject={(projectId) => {
                setSelectedProjectId(projectId);
                void lab.loadProjectWorkspace(projectId);
                setActiveView("projects");
              }}
            />
          ) : null}

          {activeView === "projects" ? (
            <ProjectsPage
              actor={actor}
              projects={lab.projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={async (projectId) => {
                setSelectedProjectId(projectId);
                await lab.loadProjectWorkspace(projectId);
              }}
              tasks={lab.projectTasks}
              projectNotes={lab.projectNotes}
              progressReports={lab.progressReports}
              projectTree={lab.projectTree}
              projectTreeSnapshots={lab.projectTreeSnapshots}
              members={lab.projectMembers}
              users={lab.users}
              pendingRegistrations={lab.pendingRegistrations}
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

          {activeView === "accounts" ? (
            <AccountsPage
              actor={actor}
              profile={lab.profile}
              users={lab.users}
              pendingRegistrations={lab.pendingRegistrations}
              onUpdateContact={lab.updateContact}
              onChangePassword={lab.changePassword}
              onRegisterUser={lab.registerUser}
              onReviewRegistration={lab.reviewRegistration}
              onResetUserPassword={lab.resetUserPassword}
              onUpdateUserRole={lab.updateUserRole}
              onDeleteUser={lab.deleteUser}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
