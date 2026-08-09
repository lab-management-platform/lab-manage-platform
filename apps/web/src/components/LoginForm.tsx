import { useState, type SyntheticEvent } from "react";

interface LoginFormProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  message: string;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
}

export function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  loading,
  message,
  onSubmit
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotTip, setShowForgotTip] = useState(false);

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
          <span className="password-wrap">
            <input
              type="text"
              value={password}
              autoComplete="new-password"
              placeholder="请输入密码"
              style={showPassword ? undefined : { WebkitTextSecurity: "disc" }}
              onChange={(event) => setPassword(event.target.value)}
            />
            {password.length > 0 ? (
              <button
                type="button"
                className="password-toggle"
                tabIndex={-1}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            ) : null}
          </span>
        </label>
        <button className="primary" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
        <span className="login-message">{message}</span>

        <button type="button" className="forgot-link" onClick={() => setShowForgotTip((v) => !v)}>
          忘记密码？
        </button>
        {showForgotTip ? (
          <div className="reset-result">
            <p>请联系实验室管理员在「管理中心」重置您的密码。</p>
            <p>登录后也可在「管理中心 → 密码与安全」自助修改。</p>
          </div>
        ) : null}
      </form>
    </main>
  );
}
