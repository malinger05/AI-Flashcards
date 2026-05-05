import { useState } from "react";
import { API_BASE } from "../constants";
import { setToken } from "../utils/storage";

function AuthRight({ question, title, subtitle, dotOn }) {
  return (
    <div className="auth-right">
      <div className="auth-right-inner">
        <div className="rcp-stack">
          <div className="rcp rcp1" />
          <div className="rcp rcp2" />
          <div className="rcp rcp3">
            <div className="rcp3-txt">{question}</div>
          </div>
        </div>
        <h2 style={{ marginTop: "1.75rem" }}>{title}</h2>
        <p>{subtitle}</p>
        <div className="rdots">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`rdot${dotOn === i ? " on" : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ onLogin, goReg }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed.");
      setToken(data.token);
      onLogin(data.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="brand-stack">
              <div className="bc bc1" />
              <div className="bc bc2" />
              <div className="bc bc3" />
            </div>
            <span className="brand-name">FlashCards</span>
          </div>
          <h1 className="auth-heading">Welcome back 👋</h1>
          <p className="auth-sub">Sign in to continue studying</p>
          {err && <div className="auth-err">{err}</div>}
          <form className="auth-form" onSubmit={submit}>
            <div className="field-wrap">
              <span className="field-icon">✉</span>
              <input
                type="text"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr("");
                }}
                autoComplete="email"
              />
            </div>
            <div className="field-wrap">
              <span className="field-icon">🔒</span>
              <input
                type="password"
                placeholder="Password"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setErr("");
                }}
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
          <p className="auth-switch">
            No account yet?{" "}
            <button type="button" onClick={goReg}>
              Create one →
            </button>
          </p>
        </div>
        <AuthRight
          question="What is osmosis?"
          title="Study smarter"
          subtitle="Paste your notes — AI turns them into perfect flashcards instantly."
          dotOn={0}
        />
      </div>
    </div>
  );
}

export function RegisterPage({ onLogin, goLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: pass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed.");
      setToken(data.token);
      onLogin(data.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="brand-stack">
              <div className="bc bc1" />
              <div className="bc bc2" />
              <div className="bc bc3" />
            </div>
            <span className="brand-name">FlashCards</span>
          </div>
          <h1 className="auth-heading">Create account ✨</h1>
          <p className="auth-sub">Join and start studying smarter</p>
          {err && <div className="auth-err">{err}</div>}
          <form className="auth-form" onSubmit={submit}>
            <div className="field-wrap">
              <span className="field-icon">👤</span>
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErr("");
                }}
                autoComplete="name"
              />
            </div>
            <div className="field-wrap">
              <span className="field-icon">✉</span>
              <input
                type="text"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr("");
                }}
                autoComplete="email"
              />
            </div>
            <div className="field-wrap">
              <span className="field-icon">🔒</span>
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setErr("");
                }}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account →"}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" onClick={goLogin}>
              Sign in →
            </button>
          </p>
        </div>
        <AuthRight
          question="What is mitosis?"
          title="Learn anything"
          subtitle="Flip cards, track your score, save your progress — all in one place."
          dotOn={1}
        />
      </div>
    </div>
  );
}
