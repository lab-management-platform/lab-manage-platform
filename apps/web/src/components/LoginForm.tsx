import type { SyntheticEvent } from "react";

interface LoginFormProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  message: string;
  resetMode: boolean;
  setResetMode: (v: boolean) => void;
  resetIdentifier: string;
  setResetIdentifier: (v: string) => void;
  resetPhone: string;
  setResetPhone: (v: string) => void;
  resetResult: string;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
  onResetPassword: (e: SyntheticEvent<HTMLFormElement>) => void;
}

export function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  loading,
  message,
  resetMode,
  setResetMode,
  resetIdentifier,
  setResetIdentifier,
  resetPhone,
  setResetPhone,
  resetResult,
  onSubmit,
  onResetPassword
}: LoginFormProps) {
  if (resetMode) {
    return (
      <main className="login-shell">
        <form className="login-panel" onSubmit={onResetPassword} autoComplete="off">
          <div className="brand login-brand">
            <span className="brand-glyph">◈</span>
            <div>
              <strong>实验室管理平台</strong>
              <span>Lab Ops Console</span>
            </div>
          </div>
          <h1>找回密码</h1>
          <p>输入账号或学号/工号，以及绑定的手机号。</p>

          <label>
            账号 / 学号 / 工号
            <input
              value={resetIdentifier}
              autoComplete="off"
              placeholder="请输入账号或学号/工号"
              onChange={(event) => setResetIdentifier(event.target.value)}
            />
          </label>
          <label>
            绑定手机号
            <input
              value={resetPhone}
              autoComplete="off"
              placeholder="请输入绑定的手机号"
              onChange={(event) => setResetPhone(event.target.value)}
            />
          </label>
          <button className="primary" disabled={loading}>
            {loading ? "验证中..." : "找回密码"}
          </button>

          {resetResult ? (
            <div className="reset-result">
              <p>{resetResult}</p>
              {resetResult.includes("新密码") ? null : <p>如无法自助找回，请联系实验室管理员。</p>}
            </div>
          ) : null}

          <button
            type="button"
            className="ghost"
            onClick={() => {
              setResetMode(false);
            }}
          >
            <span aria-hidden="true">←</span>
            返回登录
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={onSubmit} autoComplete="off">
        <div className="brand login-brand">
          <span className="brand-glyph">◈</span>
          <div>
            <strong>实验室管理平台</strong>
            <span>Lab Ops Console</span>
          </div>
        </div>
        <h1>登录工作台</h1>
        <p>可使用账号、学号/工号或手机号登录。</p>
        <label>
          账号 / 学号 / 手机号
          <input
            value={username}
            autoComplete="off"
            placeholder="请输入账号、学号/工号或手机号"
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder="请输入密码"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="primary" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
        <span className="login-message">{message}</span>

        <button type="button" className="forgot-link" onClick={() => setResetMode(true)}>
          忘记密码？
        </button>
      </form>
    </main>
  );
}
