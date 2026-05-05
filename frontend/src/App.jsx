import { useEffect, useState } from "react";
import { injectCSS } from "./utils/injectCSS";
import { getToken, clearToken } from "./utils/storage";
import { API_BASE } from "./constants";
import { LoginPage, RegisterPage } from "./components/AuthPages";
import MainApp from "./components/MainApp";

injectCSS();

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("loading"); // loading | login | register | app

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setPage("login");
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) {
          setUser(u);
          setPage("app");
        } else {
          clearToken();
          setPage("login");
        }
      })
      .catch(() => {
        clearToken();
        setPage("login");
      });
  }, []);

  function login(u) {
    setUser(u);
    setPage("app");
  }

  function logout() {
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    }).finally(() => {
      clearToken();
      setUser(null);
      setPage("login");
    });
  }

  if (page === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "1.1rem",
          color: "var(--teal-d)",
          fontWeight: 700,
        }}
      >
        Loading...
      </div>
    );
  }

  if (page === "login") {
    return <LoginPage onLogin={login} goReg={() => setPage("register")} />;
  }

  if (page === "register") {
    return <RegisterPage onLogin={login} goLogin={() => setPage("login")} />;
  }

  return <MainApp user={user} onLogout={logout} />;
}
import { useEffect, useState } from "react";
import { injectCSS } from "./utils/injectCSS";
import { getToken, clearToken, setToken } from "./utils/storage";
import { API_BASE } from "./constants";
import { LoginPage, RegisterPage } from "./components/AuthPages";
import MainApp from "./components/MainApp";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8899";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("loading"); // loading | login | register | app

  // On mount: if a token exists, verify it with the backend
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setPage("login");
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) {
          setUser(u);
          setPage("app");
        } else {
          clearToken();
          setPage("login");
        }
      })
      .catch(() => {
        clearToken();
        setPage("login");
      });
  }, []);

  function login(u) {
    setUser(u);
    setPage("app");
  }
  function logout() {
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    }).finally(() => {
      clearToken();
      setUser(null);
      setPage("login");
    });
  }

  if (page === "loading")
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "1.1rem",
          color: "var(--teal-d)",
          fontWeight: 700,
        }}
      >
        Loading…
      </div>
    );
  if (page === "login")
    return <LoginPage onLogin={login} goReg={() => setPage("register")} />;
  if (page === "register")
    return <RegisterPage onLogin={login} goLogin={() => setPage("login")} />;
  return <MainApp user={user} onLogout={logout} />;
}

/* ═══════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════ */
function LoginPage({ onLogin, goReg }) {
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
      // helpful debug hint
      if (!users.find((u) => u.email.toLowerCase() === trimEmail)) {
        return setErr(
          "No account found with that email. Please register first.",
        );
      }
      return setErr("Incorrect password. Please try again.");
    }

    // refresh user from storage in case saved cards updated
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

/* ═══════════════════════════════════════════════
   REGISTER
═══════════════════════════════════════════════ */
function RegisterPage({ onLogin, goLogin }) {
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

/* ═══════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════ */
function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState("generate");
  const [saved, setSaved] = useState(
    () => getUsers().find((u) => u.id === user.id)?.saved || [],
  );
  const [gen, setGen] = useState([]);
  const [customStudy, setCustomStudy] = useState(null);
  const [ddOpen, setDdOpen] = useState(false);
  const [modal, setModal] = useState(null); // "profile" | "history" | null
  const ddRef = useRef(null);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function persistSaved(cards) {
    setSaved(cards);
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx > -1) {
      users[idx].saved = cards;
      saveUsers(users);
      setCurrent(users[idx]);
    }
  }

  function startCustomStudy(cards) {
    setCustomStudy(cards);
    setTab("study");
  }

  function switchTab(t) {
    if (t !== "study") setCustomStudy(null);
    setTab(t);
  }

  const studyCards = customStudy ?? (gen.length ? gen : saved);

  // history derived stats
  const history = getHistory(user.id);
  const bestPct = history.length
    ? Math.max(...history.map((s) => s.pct))
    : null;
  const totalSessions = history.length;
  const totalCards = history.reduce((a, s) => a + s.total, 0);

  return (
    <div className="app-shell" onClick={() => setDdOpen(false)}>
      <header className="topbar">
        <div className="tb-left">
          <div className="tb-bs">
            <div className="tb-bc tb-bc1" />
            <div className="tb-bc tb-bc2" />
            <div className="tb-bc tb-bc3" />
          </div>
          <span className="tb-name">FlashCards</span>
        </div>

        <nav className="tb-nav">
          {["generate", "study", "saved"].map((t) => (
            <button
              key={t}
              className={`nav-btn${tab === t ? " on" : ""}`}
              onClick={() => switchTab(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        <div
          className="tb-right"
          ref={ddRef}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="uname">{user.name.split(" ")[0]}</span>
          <button className="avatar-btn" onClick={() => setDdOpen((d) => !d)}>
            {user.name[0].toUpperCase()}
          </button>

          {ddOpen && (
            <div className="acct-dropdown">
              <div className="dd-user">
                <div className="dd-user-avatar">
                  {user.name[0].toUpperCase()}
                </div>
                <div className="dd-user-info">
                  <div className="dd-user-name">{user.name}</div>
                  <div className="dd-user-email">{user.email}</div>
                </div>
              </div>
              <div className="dd-menu">
                <button
                  className="dd-btn"
                  onClick={() => {
                    setModal("profile");
                    setDdOpen(false);
                  }}
                >
                  <span className="dd-ico">👤</span> Profile
                </button>
                <button
                  className="dd-btn"
                  onClick={() => {
                    setModal("history");
                    setDdOpen(false);
                  }}
                >
                  <span className="dd-ico">📊</span> Study history
                </button>
                <div className="dd-divider" />
                <button className="dd-btn red" onClick={onLogout}>
                  <span className="dd-ico">🚪</span> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="content">
        {tab === "generate" && (
          <GenerateTab
            gen={gen}
            setGen={setGen}
            onSave={(cards) =>
              persistSaved([
                ...cards.map((c) => ({
                  ...c,
                  id: Date.now() + Math.random(),
                  saved_at: new Date().toISOString(),
                })),
                ...saved,
              ])
            }
            onStudy={() => switchTab("study")}
          />
        )}
        {tab === "study" && (
          <StudyTab
            cards={studyCards}
            customLabel={
              customStudy ? `${customStudy.length} selected cards` : null
            }
            userId={user.id}
          />
        )}
        {tab === "saved" && (
          <SavedTab
            cards={saved}
            onStudySelected={startCustomStudy}
            onExport={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([JSON.stringify(saved, null, 2)], {
                  type: "application/json",
                }),
              );
              a.download = "flashcards.json";
              a.click();
            }}
          />
        )}
      </main>

      {/* ── Profile modal ── */}
      {modal === "profile" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Profile</span>
              <button className="modal-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="prof-avatar">{user.name[0].toUpperCase()}</div>
              <p className="prof-name">{user.name}</p>
              <p className="prof-email">{user.email}</p>
              <div className="prof-stats">
                <div className="pstat">
                  <div className="pstat-val">{totalSessions}</div>
                  <div className="pstat-lbl">Sessions</div>
                </div>
                <div className="pstat">
                  <div className="pstat-val">{totalCards}</div>
                  <div className="pstat-lbl">Cards studied</div>
                </div>
                <div className="pstat">
                  <div className="pstat-val">
                    {bestPct !== null ? `${bestPct}%` : "—"}
                  </div>
                  <div className="pstat-lbl">Best score</div>
                </div>
              </div>
              <div
                className="prof-stats"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                <div className="pstat">
                  <div className="pstat-val">{saved.length}</div>
                  <div className="pstat-lbl">Saved cards</div>
                </div>
                <div className="pstat">
                  <div className="pstat-val">
                    {history.length
                      ? Math.round(
                          history.reduce((a, s) => a + s.pct, 0) /
                            history.length,
                        ) + "%"
                      : "—"}
                  </div>
                  <div className="pstat-lbl">Avg score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── History modal ── */}
      {modal === "history" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Study history</span>
              <button className="modal-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {history.length === 0 ? (
                <div className="hist-empty">
                  <div style={{ fontSize: "2.5rem", marginBottom: ".75rem" }}>
                    📭
                  </div>
                  Complete a study session to see your history here!
                </div>
              ) : (
                <>
                  {bestPct !== null && (
                    <div className="hist-best">
                      <div className="hist-best-ico">🏆</div>
                      <div className="hist-best-info">
                        <div className="hist-best-label">Personal best</div>
                        <div className="hist-best-val">{bestPct}%</div>
                        <div className="hist-best-sub">
                          {history.find((s) => s.pct === bestPct)?.total} cards
                          ·{" "}
                          {new Date(
                            history.find((s) => s.pct === bestPct)?.date,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="sess-list">
                    {history.map((s, i) => {
                      const medal =
                        s.pct === 100
                          ? "🥇"
                          : s.pct >= 80
                            ? "🥈"
                            : s.pct >= 60
                              ? "🥉"
                              : "📚";
                      const fillColor =
                        s.pct >= 70
                          ? "#1a8a85"
                          : s.pct >= 50
                            ? "#f4845f"
                            : "#e05252";
                      return (
                        <div className="sess-item" key={s.id}>
                          <div className="sess-medal">{medal}</div>
                          <div className="sess-bar-wrap">
                            <div className="sess-top">
                              <span className="sess-date">
                                {new Date(s.date).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                              <span className="sess-pct-lbl">{s.pct}%</span>
                            </div>
                            <div className="sess-track">
                              <div
                                className="sess-fill"
                                style={{
                                  width: `${s.pct}%`,
                                  background: fillColor,
                                }}
                              />
                            </div>
                            <div className="sess-meta">
                              ✓ {s.correct} correct &nbsp;·&nbsp; ✗ {s.wrong}{" "}
                              wrong &nbsp;·&nbsp; {s.total} total
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GENERATE TAB
═══════════════════════════════════════════════ */
function GenerateTab({ gen, setGen, onSave, onStudy }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function generate() {
    if (notes.trim().length < 5) return;
    setLoading(true);
    setErr("");
    setOk("");
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed.");
      if (!Array.isArray(data.flashcards) || !data.flashcards.length)
        throw new Error(
          "No flashcards returned. Try adding more detail to your notes.",
        );
      setGen(data.flashcards);
      setOk(`${data.flashcards.length} flashcards generated!`);
    } catch (e) {
      const isNetworkError = e instanceof TypeError;
      setErr(
        isNetworkError
          ? `Could not connect to backend at ${API_BASE}. Make sure the API server is running.`
          : e.message || "Request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tab-pane">
      <div className="panel">
        <div className="panel-title">
          <span className="step">1</span> Paste your notes
        </div>
        <textarea
          className="notes-area"
          rows={7}
          placeholder="Paste lecture notes, textbook passages, or any study material here…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="row">
          <button
            className="btn btn-teal"
            onClick={generate}
            disabled={loading || notes.trim().length < 5}
          >
            {loading ? (
              <>
                <span className="spin" />
                Generating…
              </>
            ) : (
              "✨ Generate flashcards"
            )}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setNotes("");
              setGen([]);
              setErr("");
              setOk("");
            }}
          >
            Clear
          </button>
        </div>
        {err && <p className="msg-err">{err}</p>}
        {ok && <p className="msg-ok">{ok}</p>}
      </div>

      {gen.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <span className="step">2</span>
              {gen.length} cards generated
              <span className="pill">{gen.length}</span>
            </div>
            <div className="row">
              <button className="btn btn-teal" onClick={() => onSave(gen)}>
                Save all
              </button>
              <button className="btn btn-ghost" onClick={onStudy}>
                Study now →
              </button>
            </div>
          </div>
          <div className="pgrid">
            {gen.map((c, i) => (
              <div className="pcard" key={i}>
                <div className="pnum">{i + 1}</div>
                <div>
                  <p className="pq">Q: {c.question}</p>
                  <p className="pa">A: {c.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SVG doodle overlay ─── */
function Doodle() {
  return (
    <div className="doodle">
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        <g opacity=".17" stroke="#0a5c59" fill="none" strokeWidth="2">
          <path d="M20 30Q40 10 60 30Q80 50 100 30" />
          <path d="M200 18Q220 0 240 18Q260 36 280 18" />
          <path d="M10 118Q30 100 50 118Q70 136 90 118" />
          <path d="M230 138Q250 120 270 138Q290 156 310 138" />
          <circle cx="300" cy="58" r="11" />
          <circle cx="160" cy="168" r="7" />
          <circle cx="14" cy="78" r="5" />
          <polygon points="148,9 158,27 138,27" />
          <polygon points="50,158 60,176 40,176" />
          <line x1="280" y1="98" x2="308" y2="126" />
          <line x1="280" y1="126" x2="308" y2="98" />
          <line x1="5" y1="148" x2="28" y2="172" />
          <line x1="5" y1="172" x2="28" y2="148" />
          <path d="M118 4Q128 14 118 24Q108 34 118 44" />
          <path d="M188 154Q198 164 188 174Q178 184 188 194" />
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STUDY TAB
═══════════════════════════════════════════════ */
function StudyTab({ cards, customLabel, userId }) {
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [swipe, setSwipe] = useState(null);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const dragX = useRef(null);
  const savedRef = useRef(false); // prevent double-saving

  function initDeck() {
    const d = [...cards]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(cards.length, 12));
    setDeck(d);
    setIdx(0);
    setFlipped(false);
    setSwipe(null);
    setRight(0);
    setWrong(0);
    setDone(false);
    setStarted(true);
    savedRef.current = false;
  }

  function flip() {
    if (!swipe) setFlipped((f) => !f);
  }

  function doSwipe(dir) {
    if (!flipped || swipe) return;
    setSwipe(dir);
    const newRight = dir === "right" ? right + 1 : right;
    const newWrong = dir === "left" ? wrong + 1 : wrong;
    if (dir === "right") setRight((r) => r + 1);
    else setWrong((w) => w + 1);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= deck.length) {
        // save session before showing results
        if (userId && !savedRef.current) {
          const total = deck.length;
          const pct = Math.round((newRight / total) * 100);
          addSession(userId, {
            correct: newRight,
            wrong: newWrong,
            total,
            pct,
          });
          savedRef.current = true;
        }
        setDone(true);
      } else {
        setIdx(next);
        setFlipped(false);
        setSwipe(null);
      }
    }, 440);
  }

  useEffect(() => {
    const h = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      }
      if (e.key === "ArrowRight") doSwipe("right");
      if (e.key === "ArrowLeft") doSwipe("left");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!cards.length)
    return (
      <div className="tab-pane center-pane">
        <div className="empty">
          <div className="empty-ico">🃏</div>
          <p>Generate or save some cards first, then study here!</p>
        </div>
      </div>
    );

  if (!started)
    return (
      <div className="tab-pane center-pane">
        <div className="sstart">
          <div className="sdeck">
            <div className="sdc sdc2" />
            <div className="sdc sdc1" />
            <div className="sdc sdc0" />
          </div>
          <h2 className="stitle">Ready to study?</h2>
          <p className="ssub">
            {customLabel ?? `${Math.min(cards.length, 12)} cards`} · tap to flip
            · swipe to score
          </p>
          <button className="btn btn-teal lg" onClick={initDeck}>
            Start session
          </button>
          <p className="shint">
            ← Didn't know &nbsp;·&nbsp; Space to flip &nbsp;·&nbsp; → Got it!
          </p>
        </div>
      </div>
    );

  if (done) {
    const pct = Math.round((right / deck.length) * 100);
    return (
      <div className="tab-pane center-pane">
        <div className="rcard">
          <div
            className="rpct"
            style={{ color: pct >= 70 ? "#0a7c5c" : "#b91c1c" }}
          >
            {pct}%
          </div>
          <p className="rmsg">
            {pct === 100
              ? "Perfect score! 🎉"
              : pct >= 80
                ? "Excellent work! 🌟"
                : pct >= 60
                  ? "Good job! Keep going 💪"
                  : "Keep practicing! 📚"}
          </p>
          <div className="rbreak">
            <div className="rbi r">
              <span className="rval">{right}</span>
              <span className="rlbl">Correct</span>
            </div>
            <div className="rbi w">
              <span className="rval">{wrong}</span>
              <span className="rlbl">Wrong</span>
            </div>
            <div className="rbi t">
              <span className="rval">{deck.length}</span>
              <span className="rlbl">Total</span>
            </div>
          </div>
          <button className="btn btn-teal" onClick={initDeck}>
            Study again
          </button>
        </div>
      </div>
    );
  }

  const card = deck[idx];
  const pct = Math.round((idx / deck.length) * 100);

  return (
    <div className="tab-pane">
      <div className="smeta">
        <span className="sctr">
          Card {idx + 1} / {deck.length}
        </span>
        <div className="scores">
          <span className="spill r">✓ {right}</span>
          <span className="spill w">✗ {wrong}</span>
        </div>
      </div>
      <div className="prog">
        <div className="progf" style={{ width: `${pct}%` }} />
      </div>

      <div
        className={`stage${swipe === "right" ? " sr" : swipe === "left" ? " sl" : ""}`}
        onClick={flipped ? undefined : flip}
        onTouchStart={(e) => {
          dragX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (dragX.current === null) return;
          const d = e.changedTouches[0].clientX - dragX.current;
          dragX.current = null;
          if (Math.abs(d) < 40) {
            flip();
            return;
          }
          doSwipe(d > 0 ? "right" : "left");
        }}
      >
        <div className={`fcard${flipped ? " flipped" : ""}`}>
          <div className="face front teal-card">
            <Doodle />
            <div className="inner-box">
              <span className="clbl">Question</span>
              <p className="ctxt">{card.question}</p>
            </div>
            {!flipped && <p className="taphint">Tap to flip</p>}
          </div>
          <div className="face back teal-card">
            <Doodle />
            <div className="inner-box">
              <span className="clbl">Answer</span>
              <p className="ctxt">{card.answer}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sacts">
        <button
          className="sbtn w"
          onClick={() => doSwipe("left")}
          disabled={!flipped}
        >
          ✗ Didn't know
        </button>
        <button className="fmid" onClick={flip}>
          {flipped ? "↺ Flip back" : "↷ Flip"}
        </button>
        <button
          className="sbtn r"
          onClick={() => doSwipe("right")}
          disabled={!flipped}
        >
          Got it! ✓
        </button>
      </div>
      <p className="kbhint">
        ← Didn't know &nbsp;·&nbsp; Space to flip &nbsp;·&nbsp; → Got it!
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SAVED TAB
═══════════════════════════════════════════════ */
function SavedTab({ cards, onExport, onStudySelected }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cards;
    return cards.filter(
      (c) =>
        c.question.toLowerCase().includes(s) ||
        c.answer.toLowerCase().includes(s),
    );
  }, [cards, q]);

  function toggleCard(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function studySelected() {
    const pick = cards.filter((c) => selected.has(c.id));
    if (pick.length) onStudySelected(pick);
  }

  const selCount = selected.size;

  return (
    <div className="tab-pane">
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            Saved flashcards <span className="pill">{cards.length}</span>
          </div>
          <div className="row">
            {selCount === 0 ? (
              <button
                className="btn btn-ghost"
                onClick={selectAll}
                disabled={!filtered.length}
              >
                Select all
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={clearSelection}>
                Clear selection
              </button>
            )}
            <button
              className="btn btn-ghost"
              onClick={onExport}
              disabled={!cards.length}
            >
              Export JSON
            </button>
          </div>
        </div>
        <input
          className="search-inp"
          type="text"
          placeholder="Search cards…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {selCount === 0 && (
          <p
            style={{
              fontSize: ".78rem",
              color: "var(--ink3)",
              fontWeight: 600,
              marginTop: ".6rem",
            }}
          >
            💡 Click cards to select them, then start a custom study session
          </p>
        )}
      </div>

      {!filtered.length ? (
        <div className="empty">
          <div className="empty-ico">{cards.length ? "🔍" : "📭"}</div>
          <p>
            {cards.length
              ? "No cards match your search."
              : "No saved cards yet — generate some!"}
          </p>
        </div>
      ) : (
        <div className="sgrid">
          {filtered.map((c, i) => {
            const id = c.id ?? i;
            const sel = selected.has(id);
            return (
              <div
                className={`scard teal-card${sel ? " selected" : ""}`}
                key={id}
                onClick={() => toggleCard(id)}
              >
                <div className="sel-check">{sel ? "✓" : ""}</div>
                <Doodle />
                <div className="scard-in">
                  <div>
                    <p className="sq">{c.question}</p>
                    <p className="sa">{c.answer}</p>
                  </div>
                  {c.saved_at && (
                    <p className="sdt">
                      {new Date(c.saved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* sticky action bar when cards are selected */}
      {selCount > 0 && (
        <div className="sel-bar">
          <div className="sel-bar-left">
            <span className="sel-count">
              {selCount} card{selCount !== 1 ? "s" : ""} selected
            </span>
            <span className="sel-hint">ready to study</span>
          </div>
          <div className="sel-actions">
            <button className="btn btn-white" onClick={clearSelection}>
              Clear
            </button>
            <button className="btn btn-violet" onClick={studySelected}>
              ▶ Study {selCount} card{selCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
