import { useState, type SyntheticEvent } from "react";
import {
  localLoginEnabled,
  oidcManager,
  publicRegistrationEnabled,
  xmuCasEnabled
} from "../auth/oidc";
import { apiBase } from "../utils/helpers";
import { PublicRegistrationPanel } from "./auth/PublicRegistrationPanel";

interface OidcLoginProps {
  onLocalLogin?: (username: string, password: string) => Promise<void>;
}

export function OidcLogin({ onLocalLogin }: OidcLoginProps) {
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  async function login() {
    setLoading(true);
    try {
      await oidcManager.signinRedirect();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法打开统一身份认证");
      setLoading(false);
    }
  }

  async function submitLocalLogin(event: SyntheticEvent) {
    event.preventDefault();
    if (!onLocalLogin) return;
    setLoading(true);
    try {
      await onLocalLogin(credentials.username, credentials.password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  if (registering) {
    return <PublicRegistrationPanel onBack={() => setRegistering(false)} />;
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-glyph">◈</span>
          <div>
            <strong>实验室管理平台</strong>
            <span>Lab Ops Console</span>
          </div>
        </div>
        <h1>进入实验室工作台</h1>
        <p>使用统一身份认证登录，密码和安全验证由认证中心管理。</p>
        <button className="primary" type="button" onClick={login} disabled={loading}>
          {loading ? "正在跳转..." : "使用统一身份认证登录"}
        </button>
        {xmuCasEnabled ? (
          <a className="secondary-button" href={`${apiBase}/auth/xmu/start`}>
            使用厦门大学统一身份认证
          </a>
        ) : null}
        {localLoginEnabled && onLocalLogin ? (
          <form className="inline-login-form" onSubmit={submitLocalLogin}>
            <div className="login-divider">或使用平台账号</div>
            <input
              required
              placeholder="账号 / 学号"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            />
            <input
              required
              type="password"
              placeholder="密码"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
            <button className="secondary-button" disabled={loading}>
              平台账号登录
            </button>
          </form>
        ) : null}
        {publicRegistrationEnabled ? (
          <button type="button" className="forgot-link" onClick={() => setRegistering(true)}>
            个人注册 / 申请加入
          </button>
        ) : null}
        {message ? <span className="login-message">{message}</span> : null}
      </section>
    </main>
  );
}
