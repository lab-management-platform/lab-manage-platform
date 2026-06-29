import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState, SectionCard, StatusBadge } from "../shared/Ui";
import { defaultResetPassword, phonePattern, roleText } from "../../utils/helpers";
import type { Actor, ManagedUser, Role } from "../../types";

interface AccountsPageProps {
  actor: Actor;
  profile: ManagedUser | null;
  users: ManagedUser[];
  onUpdateContact: (phone: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onRegisterUser: (payload: {
    username: string;
    password: string;
    studentId: string;
    displayName: string;
    role: Role;
  }) => Promise<void>;
  onResetUserPassword: (userId: string, newPassword: string) => Promise<void>;
  onUpdateUserRole: (userId: string, role: Role) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export function AccountsPage({
  actor,
  profile,
  users,
  onUpdateContact,
  onChangePassword,
  onRegisterUser,
  onResetUserPassword,
  onUpdateUserRole,
  onDeleteUser
}: AccountsPageProps) {
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "" });
  const [registerDraft, setRegisterDraft] = useState({
    username: "",
    password: defaultResetPassword,
    studentId: "",
    displayName: "",
    role: "student" as Role
  });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const visibleUsers = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return users.filter((user) =>
      keyword
        ? [user.displayName, user.username, user.studentId ?? ""].some((field) =>
            field.toLowerCase().includes(keyword)
          )
        : true
    );
  }, [deferredSearch, users]);

  return (
    <div className="page-grid">
      <div className="split-layout">
        <SectionCard title="账户概览" eyebrow="Profile">
          <div className="profile-banner">
            <div className="avatar-orb large">{actor.displayName.slice(0, 1)}</div>
            <div>
              <h3>{profile?.displayName ?? actor.displayName}</h3>
              <p>
                {roleText(profile?.role ?? actor.role)} · {profile?.studentId ?? actor.username}
              </p>
            </div>
          </div>
          <div className="meta-grid">
            <span>账号：{profile?.username ?? actor.username}</span>
            <span>手机号：{profile?.phone ?? "未绑定"}</span>
            <span>认证方式：{profile?.identityProvider ?? "local"}</span>
            <span>创建时间：{profile ? new Date(profile.createdAt).toLocaleDateString("zh-CN") : "-"}</span>
          </div>
        </SectionCard>

        <SectionCard title="个人设置" eyebrow="Settings">
          <form
            className="inline-form stacked"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!phonePattern.test(phone)) return;
              await onUpdateContact(phone);
            }}
          >
            <label>
              联系手机
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <button className="secondary-button">更新手机号</button>
          </form>
          <form
            className="inline-form stacked"
            onSubmit={async (event) => {
              event.preventDefault();
              await onChangePassword(passwordDraft.currentPassword, passwordDraft.newPassword);
              setPasswordDraft({ currentPassword: "", newPassword: "" });
            }}
          >
            <label>
              当前密码
              <input
                type="password"
                value={passwordDraft.currentPassword}
                onChange={(event) =>
                  setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }))
                }
              />
            </label>
            <label>
              新密码
              <input
                type="password"
                value={passwordDraft.newPassword}
                onChange={(event) =>
                  setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))
                }
              />
            </label>
            <button className="tertiary-button">修改密码</button>
          </form>
        </SectionCard>
      </div>

      {actor.permissions.includes("user:write") ? (
        <div className="split-layout">
          <SectionCard title="新增成员" eyebrow="User Provisioning">
            <form
              className="form-grid compact"
              onSubmit={async (event) => {
                event.preventDefault();
                await onRegisterUser(registerDraft);
                setRegisterDraft({
                  username: "",
                  password: defaultResetPassword,
                  studentId: "",
                  displayName: "",
                  role: "student"
                });
              }}
            >
              <label>
                登录名
                <input
                  value={registerDraft.username}
                  onChange={(event) =>
                    setRegisterDraft((current) => ({ ...current, username: event.target.value }))
                  }
                />
              </label>
              <label>
                学号/工号
                <input
                  value={registerDraft.studentId}
                  onChange={(event) =>
                    setRegisterDraft((current) => ({ ...current, studentId: event.target.value }))
                  }
                />
              </label>
              <label>
                显示名称
                <input
                  value={registerDraft.displayName}
                  onChange={(event) =>
                    setRegisterDraft((current) => ({ ...current, displayName: event.target.value }))
                  }
                />
              </label>
              <label>
                角色
                <select
                  value={registerDraft.role}
                  onChange={(event) =>
                    setRegisterDraft((current) => ({
                      ...current,
                      role: event.target.value as Role
                    }))
                  }
                >
                  <option value="student">学生</option>
                  <option value="professor">教授</option>
                  <option value="lab_admin">实验室管理员</option>
                </select>
              </label>
              <label>
                初始密码
                <input
                  value={registerDraft.password}
                  onChange={(event) =>
                    setRegisterDraft((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <button className="primary-button">创建账号</button>
            </form>
          </SectionCard>

          <SectionCard title="成员列表" eyebrow="Role Matrix">
            <div className="toolbar-row">
              <input placeholder="搜索用户名、姓名或学号" value={search} onChange={(event) => setSearch(event.target.value)} />
              <span className="panel-tag">角色分级已启用</span>
            </div>
            <div className="data-list">
              {visibleUsers.length === 0 ? (
                <EmptyState title="暂无匹配成员" text="换个关键词试试，或先创建新账号。" />
              ) : (
                visibleUsers.map((user) => (
                  <article key={user.id} className="user-card">
                    <div>
                      <strong>{user.displayName}</strong>
                      <small>
                        {user.username} · {user.studentId ?? "-"}
                      </small>
                    </div>
                    <div className="row-inline wrap">
                      <StatusBadge tone={user.active ? "active" : "muted"}>{roleText(user.role)}</StatusBadge>
                      {user.id !== actor.id ? (
                        <>
                          <select value={user.role} onChange={(event) => onUpdateUserRole(user.id, event.target.value as Role)}>
                            <option value="student">学生</option>
                            <option value="professor">教授</option>
                            <option value="lab_admin">实验室管理员</option>
                          </select>
                          <button
                            type="button"
                            className="tertiary-button"
                            onClick={() => onResetUserPassword(user.id, defaultResetPassword)}
                          >
                            重置密码
                          </button>
                          <button type="button" className="tertiary-button ghost-tone" onClick={() => onDeleteUser(user.id)}>
                            停用
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
