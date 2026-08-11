import { useState } from "react";
import { oidcManager } from "../auth/oidc";

export function OidcLogin() {
  const [loading, setLoading] = useState(false);
  async function login() {
    setLoading(true);
    sessionStorage.setItem("oidc_redirect_hash", window.location.hash);
    await oidcManager.signinRedirect();
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
      </section>
    </main>
  );
}
