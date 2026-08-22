import { useState, type FormEvent } from "react";
import {
  localLoginEnabled,
  oidcManager,
  publicRegistrationEnabled,
  xmuCasEnabled
} from "../auth/oidc";
import { apiBase } from "../utils/helpers";

interface OidcLoginProps {
  onLocalLogin?: (username: string, password: string) => Promise<void>;
}

export function OidcLogin({ onLocalLogin }: OidcLoginProps) {
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [registration, setRegistration] = useState({
    username: "",
    password: "",
    identityNo: "",
    displayName: "",
    phone: ""
  });
  async function login() {
    setLoading(true);
    try {
      await oidcManager.signinRedirect();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法打开统一身份认证");
      setLoading(false);
    }
  }

  async function submitLocalLogin(event: FormEvent) {
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

  async function submitRegistration(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registration,
          identityType: "student_no",
          reason: "个人申请加入实验室"
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "注册申请提交失败");
      setMessage(payload.message ?? "注册申请已提交，请等待管理员审核");
      setRegistering(false);
      setRegistration({ username: "", password: "", identityNo: "", displayName: "", phone: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册申请提交失败");
    } finally {
      setLoading(false);
    }
  }

  if (registering) {
    return (
      <main className="login-shell">
        <form className="login-panel" onSubmit={submitRegistration} autoComplete="off">
          <div className="brand login-brand">
            <span className="brand-glyph">◈</span>
            <div>
              <strong>实验室管理平台</strong>
              <span>Lab Ops Console</span>
            </div>
          </div>
          <h1>申请加入</h1>
          <p>提交后由实验室管理员审核，审核通过后才能登录。</p>
          <label>
            登录名
            <input
              required
              value={registration.username}
              onChange={(e) => setRegistration({ ...registration, username: e.target.value })}
            />
          </label>
          <label>
            姓名
            <input
              required
              value={registration.displayName}
              onChange={(e) => setRegistration({ ...registration, displayName: e.target.value })}
            />
          </label>
          <label>
            学号
            <input
              required
              value={registration.identityNo}
              onChange={(e) => setRegistration({ ...registration, identityNo: e.target.value })}
            />
          </label>
          <label>
            手机号（可选）
            <input
              value={registration.phone}
              onChange={(e) => setRegistration({ ...registration, phone: e.target.value })}
            />
          </label>
          <label>
            密码
            <input
              required
              type="password"
              minLength={8}
              value={registration.password}
              onChange={(e) => setRegistration({ ...registration, password: e.target.value })}
            />
          </label>
          <button className="primary" disabled={loading}>
            {loading ? "提交中..." : "提交注册申请"}
          </button>
          {message ? <span className="login-message">{message}</span> : null}
          <button type="button" className="forgot-link" onClick={() => setRegistering(false)}>
            返回登录
          </button>
        </form>
      </main>
    );
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
