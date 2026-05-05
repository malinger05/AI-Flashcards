import { useState } from "react";
import { getUsers, saveUsers } from "../utils/storage";

export function LoginPage({ onLogin, goReg }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    const trimEmail = email.trim().toLowerCase();
    const trimPass = pass.trim();
    if (!trimEmail) return setErr("Please enter your email.");
    if (!trimPass) return setErr("Please enter your password.");

    const users = getUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === trimEmail && u.password === trimPass,
    );
    if (!found) {
      if (!users.find((u) => u.email.toLowerCase() === trimEmail))
        return setErr(
          "No account found with that email. Please register first.",
        );
      return setErr("Incorrect password. Please try again.");
    }
    onLogin(found);
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
            <button type="submit" className="btn-submit">
              Sign in →
            </button>
          </form>
          <p className="auth-switch">
            No account yet?{" "}
            <button type="button" onClick={goReg}>
              Create one →
            </button>
          </p>
        </div>
        <div className="auth-right">
          <div className="auth-right-inner">
            <div className="rcp-stack">
              <div className="rcp rcp1" />
              <div className="rcp rcp2" />
              <div className="rcp rcp3">
                <div className="rcp3-txt">What is osmosis?</div>
              </div>
            </div>
            <h2 style={{ marginTop: "1.75rem" }}>Study smarter</h2>
            <p>
              Paste your notes — AI turns them into perfect flashcards
              instantly.
            </p>
            <div className="rdots">
              <div className="rdot on" />
              <div className="rdot" />
              <div className="rdot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage({ onLogin, goLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    const trimName = name.trim();
    const trimEmail = email.trim().toLowerCase();
    const trimPass = pass.trim();
    if (!trimName) return setErr("Please enter your name.");
    if (!trimEmail) return setErr("Please enter your email.");
    if (!trimEmail.includes("@"))
      return setErr("Please enter a valid email address.");
    if (trimPass.length < 6)
      return setErr("Password must be at least 6 characters.");

    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === trimEmail))
      return setErr("An account with this email already exists.");

    const newUser = {
      id: Date.now(),
      name: trimName,
      email: trimEmail,
      password: trimPass,
      saved: [],
    };
    saveUsers([...users, newUser]);
    onLogin(newUser);
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
            <button type="submit" className="btn-submit">
              Create account →
            </button>
          </form>
          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" onClick={goLogin}>
              Sign in →
            </button>
          </p>
        </div>
        <div className="auth-right">
          <div className="auth-right-inner">
            <div className="rcp-stack">
              <div className="rcp rcp1" />
              <div className="rcp rcp2" />
              <div className="rcp rcp3">
                <div className="rcp3-txt">What is mitosis?</div>
              </div>
            </div>
            <h2 style={{ marginTop: "1.75rem" }}>Learn anything</h2>
            <p>
              Flip cards, track your score, save your progress — all in one
              place.
            </p>
            <div className="rdots">
              <div className="rdot" />
              <div className="rdot on" />
              <div className="rdot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
