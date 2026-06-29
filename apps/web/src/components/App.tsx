import type { SyntheticEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { LoginForm } from "./LoginForm";
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
    const firstProjectId = lab.projects[0]?.id;
    if (firstProjectId) {
      setSelectedProjectId(firstProjectId);
      lab.loadProjectWorkspace(firstProjectId).catch(() => {
        // keep shell responsive
      });
    }
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

  async function resetPassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setResetResult("");
    try {
      const response = await fetch(`${apiBase}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: resetIdentifier, phone: resetPhone })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "找回密码失败");
      }
      setResetResult(`密码已重置，新密码：${payload.newPassword}`);
    } catch (error) {
      setResetResult(error instanceof Error ? error.message : "找回密码失败");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    setToken("");
    setActor(null);
    setSelectedProjectId("");
    sessionStorage.removeItem("lab_token");
    sessionStorage.removeItem("lab_actor");
  }

  if (!actor) {
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
          onSelectProject={async (projectId) => {
            setSelectedProjectId(projectId);
            if (projectId) {
              await lab.loadProjectWorkspace(projectId);
            }
          }}
          onLogout={logout}
        />

        <div className="workspace-body">
          {activeView === "dashboard" ? (
            <DashboardPage
              actorName={actor.displayName}
              summary={lab.summary}
              projects={lab.projects}
              tasks={lab.projectTasks}
              materials={lab.materials}
              applications={lab.applications}
              notifications={lab.notifications}
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
              progressReports={lab.progressReports}
              members={lab.projectMembers}
              onCreateProject={lab.createProject}
              onApproveProject={lab.approveProject}
              onCreateTask={lab.createTask}
              onCompleteTask={lab.completeTask}
              onCreateProgress={lab.createProgress}
            />
          ) : null}

          {activeView === "inventory" ? (
            <InventoryPage
              actor={actor}
              summary={lab.summary}
              materials={lab.materials}
              applications={lab.applications}
              stockMovements={lab.stockMovements}
              projects={lab.projects}
              selectedProjectId={selectedProjectId}
              onSubmitApplication={lab.submitApplication}
              onStockIn={lab.stockIn}
              onReviewApplication={lab.reviewApplication}
            />
          ) : null}

          {activeView === "files" ? (
            <FilesPage
              actor={actor}
              files={lab.files}
              versions={lab.fileVersions}
              onSelectFile={lab.loadFileVersions}
            />
          ) : null}

          {activeView === "meetings" ? (
            <MeetingsPage
              actor={actor}
              meetings={lab.meetings}
              notifications={lab.notifications}
              onCreateMeeting={lab.createMeeting}
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
              onDeleteKnowledge={lab.deleteKnowledge}
            />
          ) : null}

          {activeView === "accounts" ? (
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
        </div>
      </section>
    </main>
  );
}
