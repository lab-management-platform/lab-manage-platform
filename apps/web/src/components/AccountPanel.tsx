import type { SyntheticEvent } from "react";
import { ClipboardList, KeyRound, ShieldCheck, Smartphone, Users } from "lucide-react";
import { roleText, permissionLabels, rolePermissions, accountPreviewLimit } from "../utils/helpers";
import type { Actor, ManagedUser, Role } from "../types";

interface AccountPanelProps {
  actor: Actor;
  canManageUsers: boolean;
  loading: boolean;
  profile: ManagedUser | null;
  users: ManagedUser[];
  accountTab: string;
  setAccountTab: (v: "profile" | "security" | "list" | "roles" | "register") => void;
  userSearch: string;
  setUserSearch: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  registerUsername: string;
  setRegisterUsername: (v: string) => void;
  registerPassword: string;
  setRegisterPassword: (v: string) => void;
  registerStudentId: string;
  setRegisterStudentId: (v: string) => void;
  registerDisplayName: string;
  setRegisterDisplayName: (v: string) => void;
  registerRole: "admin" | "member";
  setRegisterRole: (v: "admin" | "member") => void;
  displayedUsers: ManagedUser[];
  hasMoreUsers: boolean;
  showAllAccounts: boolean;
  setShowAllAccounts: (v: boolean) => void;
  showInactiveAccounts: boolean;
  setShowInactiveAccounts: (v: boolean) => void;
  onUpdateContact: (e: SyntheticEvent<HTMLFormElement>) => void;
  onChangePassword: (e: SyntheticEvent<HTMLFormElement>) => void;
  onRegisterUser: (e: SyntheticEvent<HTMLFormElement>) => void;
  onResetUserPassword: (user: ManagedUser) => void;
  onDeleteUser: (user: ManagedUser) => void;
  onUpdateUserRole: (user: ManagedUser, role: "admin" | "member") => void;
}

export function AccountPanel({
  actor,
  canManageUsers,
  loading,
  profile,
  users,
  accountTab,
  setAccountTab,
  userSearch,
  setUserSearch,
  contactPhone,
  setContactPhone,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  registerUsername,
  setRegisterUsername,
  registerPassword,
  setRegisterPassword,
  registerStudentId,
  setRegisterStudentId,
  registerDisplayName,
  setRegisterDisplayName,
  registerRole,
  setRegisterRole,
  displayedUsers,
  hasMoreUsers,
  showAllAccounts,
  setShowAllAccounts,
  showInactiveAccounts,
  setShowInactiveAccounts,
  onUpdateContact,
  onChangePassword,
  onRegisterUser,
  onResetUserPassword,
  onDeleteUser,
  onUpdateUserRole
}: AccountPanelProps) {
  return (
    <section className="panel member-panel" id="members">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Members</p>
          <h2>账户管理</h2>
        </div>
        <Users size={20} />
      </div>

      <div className="subnav">
        <button
          type="button"
          className={accountTab === "profile" ? "selected" : ""}
          onClick={() => setAccountTab("profile")}
        >
          个人资料
        </button>
        <button
          type="button"
          className={accountTab === "security" ? "selected" : ""}
          onClick={() => setAccountTab("security")}
        >
          修改密码
        </button>
        {canManageUsers ? (
          <>
            <button
              type="button"
              className={accountTab === "list" ? "selected" : ""}
              onClick={() => setAccountTab("list")}
            >
              账号列表
            </button>
            <button
              type="button"
              className={accountTab === "roles" ? "selected" : ""}
              onClick={() => setAccountTab("roles")}
            >
              角色权限
            </button>
            <button
              type="button"
              className={accountTab === "register" ? "selected" : ""}
              onClick={() => setAccountTab("register")}
            >
              注册账号
            </button>
          </>
        ) : null}
      </div>

      {accountTab === "profile" ? (
        <div className="profile-grid">
          <article className="profile-card">
            <Users size={22} />
            <span>账号</span>
            <strong>{profile?.username ?? actor.username}</strong>
          </article>
          <article className="profile-card">
            <ClipboardList size={22} />
            <span>学号/工号</span>
            <strong>{profile?.studentId ?? "-"}</strong>
          </article>
          <article className="profile-card">
            <ShieldCheck size={22} />
            <span>角色</span>
            <strong>{roleText(profile?.role ?? actor.role)}</strong>
          </article>
          <article className="profile-card">
            <Smartphone size={22} />
            <span>绑定手机</span>
            <strong>{profile?.phone ?? "未绑定"}</strong>
          </article>
          <form className="contact-form" onSubmit={onUpdateContact}>
            <label>
              修改绑定手机
              <input
                placeholder="请输入 11 位手机号"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </label>
            <button className="primary" disabled={loading}>
              {loading ? "保存中..." : "保存手机号"}
            </button>
          </form>
        </div>
      ) : null}

      {accountTab === "security" ? (
        <form className="security-form" onSubmit={onChangePassword}>
          <div className="security-title">
            <KeyRound size={22} />
            <div>
              <h3>修改登录密码</h3>
              <p>本地账号可在此修改密码；统一身份认证账号以后将跳转到学校认证系统处理。</p>
            </div>
          </div>
          <label>
            当前密码
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            确认新密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={loading}>
            {loading ? "修改中..." : "修改密码"}
          </button>
        </form>
      ) : null}

      {accountTab === "list" && canManageUsers ? (
        <div className="account-list">
          <div className="account-toolbar">
            <label className="search-box">
              搜索账号
              <input
                placeholder="按账号、姓名、学号/工号搜索"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={showInactiveAccounts}
                onChange={(e) => setShowInactiveAccounts(e.target.checked)}
              />
              显示停用账号
            </label>
          </div>
          <div className={`account-table list-frame ${showAllAccounts ? "expanded" : ""}`}>
            <div className="account-head">
              <span>账号</span>
              <span>姓名</span>
              <span>学号/工号</span>
              <span>手机</span>
              <span>角色</span>
              <span>来源</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            {displayedUsers.map((user) => (
              <div className="account-row" key={user.id}>
                <span>{user.username}</span>
                <span>{user.displayName}</span>
                <span>{user.studentId ?? "-"}</span>
                <span>{user.phone ?? "-"}</span>
                <span>
                  {user.active && user.id !== actor.id && user.role !== "super_admin" ? (
                    <select
                      className="role-select"
                      value={user.role}
                      disabled={loading}
                      onChange={(e) => onUpdateUserRole(user, e.target.value as "admin" | "member")}
                    >
                      <option value="member">成员</option>
                      <option value="admin">管理员</option>
                    </select>
                  ) : (
                    roleText(user.role)
                  )}
                </span>
                <span>{user.identityProvider}</span>
                <span>{user.active ? "启用" : "停用"}</span>
                <span className="row-actions">
                  {user.role === "member" && user.active ? (
                    <>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onResetUserPassword(user)}
                      >
                        重置密码
                      </button>
                      <button type="button" disabled={loading} onClick={() => onDeleteUser(user)}>
                        删除
                      </button>
                    </>
                  ) : (
                    <small>-</small>
                  )}
                </span>
              </div>
            ))}
          </div>
          {hasMoreUsers ? (
            <button
              className="ghost more-button"
              type="button"
              onClick={() => setShowAllAccounts((v) => !v)}
            >
              {showAllAccounts
                ? "收起"
                : `展示更多（还有 ${users.length - accountPreviewLimit} 个）`}
            </button>
          ) : null}
        </div>
      ) : null}

      {accountTab === "roles" && canManageUsers ? (
        <div className="role-permission-grid">
          {(["member", "admin", "super_admin"] as Role[]).map((role) => (
            <article className="role-permission-card" key={role}>
              <div>
                <ShieldCheck size={22} />
                <h3>{roleText(role)}</h3>
              </div>
              <p>
                {role === "member"
                  ? "普通成员只保留申请、查看资料与参与项目的基础权限。"
                  : "管理员负责账号、库存、文件、项目与会议的日常管理。"}
              </p>
              <div className="permission-pills">
                {rolePermissions[role].map((perm) => (
                  <span key={perm}>{permissionLabels[perm]}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {accountTab === "register" && canManageUsers ? (
        <form className="member-form" onSubmit={onRegisterUser}>
          <label>
            登录账号
            <input value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} />
          </label>
          <label>
            姓名
            <input
              value={registerDisplayName}
              onChange={(e) => setRegisterDisplayName(e.target.value)}
            />
          </label>
          <label>
            学号/工号
            <input
              value={registerStudentId}
              onChange={(e) => setRegisterStudentId(e.target.value)}
            />
          </label>
          <label>
            初始密码
            <input
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
            />
          </label>
          <label>
            角色
            <select
              value={registerRole}
              onChange={(e) => setRegisterRole(e.target.value as "admin" | "member")}
            >
              <option value="member">成员</option>
              <option value="admin">管理员</option>
            </select>
          </label>
          <button className="primary" disabled={loading}>
            {loading ? "创建中..." : "创建账号"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
