import { useState, type SyntheticEvent } from "react";
import { apiBase } from "../../utils/helpers";

interface PublicRegistrationPanelProps {
  onBack: () => void;
}

type RegistrationStatusResult = {
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

export function PublicRegistrationPanel({ onBack }: PublicRegistrationPanelProps) {
  const [view, setView] = useState<"register" | "status">("register");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [registration, setRegistration] = useState({
    username: "",
    password: "",
    identityNo: "",
    displayName: "",
    phone: ""
  });
  const [statusQuery, setStatusQuery] = useState({ username: "", identityNo: "" });
  const [statusResult, setStatusResult] = useState<RegistrationStatusResult | null>(null);

  async function submitRegistration(event: SyntheticEvent) {
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
      setStatusQuery({ username: registration.username, identityNo: registration.identityNo });
      setRegistration({ username: "", password: "", identityNo: "", displayName: "", phone: "" });
      setView("status");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册申请提交失败");
    } finally {
      setLoading(false);
    }
  }

  async function submitStatusQuery(event: SyntheticEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/registration/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusQuery)
      });
      const payload = (await response.json()) as RegistrationStatusResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "查询失败");
      setStatusResult(payload);
      setMessage("");
    } catch (error) {
      setStatusResult(null);
      setMessage(error instanceof Error ? error.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }

  const statusText = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已驳回"
  } as const;

  return (
    <main className="login-shell">
      <form
        className="login-panel"
        onSubmit={view === "register" ? submitRegistration : submitStatusQuery}
        autoComplete="off"
      >
        <div className="brand login-brand">
          <span className="brand-glyph">◈</span>
          <div>
            <strong>实验室管理平台</strong>
            <span>Lab Ops Console</span>
          </div>
        </div>

        {view === "register" ? (
          <>
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
            <button type="button" className="forgot-link" onClick={() => setView("status")}>
              已提交？查询申请状态
            </button>
          </>
        ) : (
          <>
            <h1>查询申请状态</h1>
            <p>输入申请时填写的账号和学号。</p>
            <label>
              账号 / 学号
              <input
                required
                value={statusQuery.username}
                onChange={(e) => setStatusQuery({ ...statusQuery, username: e.target.value })}
              />
            </label>
            <label>
              学号
              <input
                required
                value={statusQuery.identityNo}
                onChange={(e) => setStatusQuery({ ...statusQuery, identityNo: e.target.value })}
              />
            </label>
            <button className="primary" disabled={loading}>
              {loading ? "查询中..." : "查询状态"}
            </button>
            <button type="button" className="forgot-link" onClick={() => setView("register")}>
              返回注册
            </button>
            {statusResult ? (
              <div className="reset-result">
                <p>审核状态：{statusText[statusResult.status]}</p>
                {statusResult.rejectionReason ? (
                  <p>驳回原因：{statusResult.rejectionReason}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        {message ? <span className="login-message">{message}</span> : null}
        <button type="button" className="ghost" onClick={onBack}>
          <span aria-hidden="true">←</span>
          返回登录
        </button>
      </form>
    </main>
  );
}
