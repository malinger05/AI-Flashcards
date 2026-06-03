import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../constants";
import GenerateTab from "./GenerateTab";
import StudyTab from "./StudyTab";
import QuizTab from "./QuizTab";
import SavedTab from "./SavedTab";
import StatsTab from "./StatsTab";

// ── Dark-mode helper ──────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("fc_dark");
    if (stored !== null) return stored === "1";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
    localStorage.setItem("fc_dark", dark ? "1" : "0");
  }, [dark]);
  return [dark, setDark];
}

// ── Streak helper (localStorage-based, syncs with study sessions) ─────────────
function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const days = [
    ...new Set(
      sessions.map((s) => new Date(s.created_at).toLocaleDateString("en-CA")),
    ),
  ].sort((a, b) => (a > b ? -1 : 1));

  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (prev - curr) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export default function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState("generate");
  const [saved, setSaved] = useState([]);
  const [gen, setGen] = useState([]);
  const [customStudy, setCustomStudy] = useState(null);
  const [ddOpen, setDdOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [history, setHistory] = useState([]);
  const [sessionCards, setSessionCards] = useState(null);
  const [loadingSessionCards, setLoadingSessionCards] = useState(false);
  const [decks, setDecks] = useState([]);
  const [dark, setDark] = useDarkMode();
  const ddRef = useRef(null);
  // S3-007: Ollama health banner state
  const [ollamaDown, setOllamaDown] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem("ollama_banner_dismissed") === "1",
  );

  // S3-007: health check on mount
  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.ollama === "unreachable") setOllamaDown(true);
      })
      .catch(() => {});
  }, []);

  // Load flashcards
  useEffect(() => {
    apiFetch("/flashcards")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSaved(data);
      })
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

  // SCRUM-94: load study history on mount for stats tab and history modal
  useEffect(() => {
    apiFetch("/study/history")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {});
  }, []);

  // Load decks
  useEffect(() => {
    apiFetch("/decks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDecks(data);
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function persistSaved(cards) {
    try {
      const res = await apiFetch("/flashcards", {
        method: "POST",
        body: JSON.stringify(
          cards.map((c) => ({ question: c.question, answer: c.answer })),
        ),
      });
      const data = await res.json();
      if (Array.isArray(data)) setSaved((prev) => [...data, ...prev]);
    } catch (e) {
      console.error("Failed to save flashcards", e);
    }
  }

  async function refreshSaved() {
    const res = await apiFetch("/flashcards");
    const data = await res.json();
    if (Array.isArray(data)) setSaved(data);
  }

  function onSessionSaved(session) {
    setHistory((prev) => [session, ...prev]);
  }

  async function viewSessionCards(sessionId) {
    setLoadingSessionCards(true);
    setSessionCards(null);
    try {
      const res = await apiFetch(`/study/history/${sessionId}/cards`);
      const data = await res.json();
      if (Array.isArray(data)) setSessionCards(data);
    } catch (e) {
      console.error("Failed to load session cards", e);
    } finally {
      setLoadingSessionCards(false);
    }
  }

  function startCustomStudy(cards) {
    setCustomStudy(cards);
    setTab("study");
  }
  function switchTab(t) {
    if (t !== "study") setCustomStudy(null);
    setTab(t);
    // S3-007: re-check health when user opens Generate tab
    if (t === "generate") {
      fetch("/health")
        .then((r) => r.json())
        .then((data) => {
          setOllamaDown(data.ollama === "unreachable");
        })
        .catch(() => {});
    }
  }

  async function handleEditCard(id, question, answer) {
    try {
      const res = await apiFetch(`/flashcards/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ question, answer }),
      });
      if (res.ok) {
        setSaved((prev) =>
          prev.map((c) => (c.id === id ? { ...c, question, answer } : c)),
        );
      }
    } catch (e) {
      console.error("Edit failed", e);
    }
  }

  async function handleCreateDeck(name) {
    try {
      const res = await apiFetch("/decks", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const deck = await res.json();
      if (deck.id) setDecks((prev) => [deck, ...prev]);
    } catch (e) {
      console.error("Create deck failed", e);
    }
  }

  async function handleAddToDeck(deckId, cardIds) {
    try {
      await apiFetch(`/decks/${deckId}/cards`, {
        method: "POST",
        body: JSON.stringify({ flashcard_ids: cardIds }),
      });
      // Refresh decks to get updated card counts
      const res = await apiFetch("/decks");
      const data = await res.json();
      if (Array.isArray(data)) setDecks(data);
    } catch (e) {
      console.error("Add to deck failed", e);
    }
  }

  async function handleDeleteDeck(deckId) {
    try {
      await apiFetch(`/decks/${deckId}`, { method: "DELETE" });
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
    } catch (e) {
      console.error("Delete deck failed", e);
    }
  }

  const studyCards = customStudy ?? (gen.length ? gen : saved);
  const streak = computeStreak(history);
  const bestPct = history.length
    ? Math.max(...history.map((s) => s.pct))
    : null;

  const TABS = ["generate", "study", "quiz", "saved", "stats"];

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
          {TABS.map((t) => (
            <button
              key={t}
              className={`nav-btn${tab === t ? " on" : ""}`}
              onClick={() => switchTab(t)}
            >
              {t === "stats" ? "Stats" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        <div
          className="tb-right"
          ref={ddRef}
          onClick={(e) => e.stopPropagation()}
        >
          {streak > 0 && (
            <div className="streak-badge" title={`${streak}-day study streak`}>
              🔥 {streak}
            </div>
          )}
          <button
            className="dark-toggle"
            onClick={() => setDark((d) => !d)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle dark mode"
          >
            {dark ? "☀️" : "🌙"}
          </button>
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
                {/* SCRUM-94: profile menu entry — opens study history modal (GET /study/history) */}
                <button
                  className="dd-btn"
                  onClick={() => {
                    setModal("history");
                    setDdOpen(false);
                    setSessionCards(null);
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
        {/* S3-007: Ollama offline warning banner */}
        {ollamaDown && !bannerDismissed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
              padding: "10px 18px",
              background: "#fffbeb",
              borderBottom: "2px solid #f59e0b",
              fontSize: ".85rem",
              fontWeight: 700,
              color: "#92400e",
            }}
          >
            <span>
              ⚠️ <strong>Ollama is offline</strong> — Generate and Quiz features
              may not work. Make sure Ollama is running (
              <code style={{ fontFamily: "monospace", fontSize: ".8em" }}>
                ollama serve
              </code>
              ).
            </span>
            <button
              onClick={() => {
                setBannerDismissed(true);
                sessionStorage.setItem("ollama_banner_dismissed", "1");
              }}
              style={{
                background: "none",
                border: "1.5px solid #f59e0b",
                borderRadius: 8,
                padding: "3px 12px",
                cursor: "pointer",
                fontWeight: 800,
                color: "#92400e",
                fontSize: ".82rem",
                fontFamily: "inherit",
              }}
            >
              Dismiss ✕
            </button>
          </div>
        )}
        {tab === "generate" && (
          <GenerateTab
            gen={gen}
            setGen={setGen}
            onSave={async (cards) => {
              await persistSaved(cards);
              await refreshSaved();
            }}
            onStudy={() => switchTab("study")}
          />
        )}
        {tab === "study" && (
          <StudyTab
            cards={studyCards}
            customLabel={
              customStudy ? `${customStudy.length} selected cards` : null
            }
            onSessionSaved={onSessionSaved}
          />
        )}
        {tab === "quiz" && <QuizTab savedCards={saved} />}
        {tab === "saved" &&
          (loadingCards ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem",
                color: "var(--ink3)",
                fontWeight: 700,
              }}
            >
              Loading cards…
            </div>
          ) : (
            <SavedTab
              cards={saved}
              decks={decks}
              onStudySelected={startCustomStudy}
              onDelete={(id) =>
                setSaved((prev) => prev.filter((c) => c.id !== id))
              }
              onEdit={handleEditCard}
              onCreateDeck={handleCreateDeck}
              onAddToDeck={handleAddToDeck}
              onDeleteDeck={handleDeleteDeck}
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
          ))}
        {tab === "stats" && (
          <StatsTab history={history} saved={saved} streak={streak} />
        )}
      </main>

      {/* PROFILE MODAL */}
      {modal === "profile" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div
            className="modal"
            style={{ maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="modal-title">Profile</span>
              <button className="modal-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 0",
                }}
              >
                <div
                  className="dd-user-avatar"
                  style={{ width: 64, height: 64, fontSize: "1.75rem" }}
                >
                  {user.name[0].toUpperCase()}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      color: "var(--ink)",
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: ".85rem",
                      color: "var(--ink3)",
                      marginTop: 4,
                    }}
                  >
                    {user.email}
                  </div>
                </div>
                <div className="rbreak" style={{ marginTop: "1rem" }}>
                  <div className="rbi t">
                    <span className="rval">{saved.length}</span>
                    <span className="rlbl">Cards</span>
                  </div>
                  <div className="rbi r">
                    <span className="rval">{history.length}</span>
                    <span className="rlbl">Sessions</span>
                  </div>
                  <div
                    className="rbi"
                    style={{
                      background: "#fff8e6",
                      borderRadius: 12,
                      padding: "10px 18px",
                    }}
                  >
                    <span className="rval">🔥 {streak}</span>
                    <span className="rlbl">Streak</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCRUM-94: study history modal — session list + drill-down to per-card results */}
      {modal === "history" && (
        <div
          className="modal-overlay"
          onClick={() => {
            setModal(null);
            setSessionCards(null);
          }}
        >
          <div
            className="modal"
            style={{ maxWidth: sessionCards ? 700 : 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              {sessionCards ? (
                <button
                  className="modal-close"
                  style={{ marginRight: 8 }}
                  onClick={() => setSessionCards(null)}
                >
                  ←
                </button>
              ) : null}
              <span className="modal-title">
                {sessionCards ? "Cards in this session" : "Study history"}
              </span>
              <button
                className="modal-close"
                onClick={() => {
                  setModal(null);
                  setSessionCards(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {sessionCards ? (
                loadingSessionCards ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "var(--ink3)",
                      fontWeight: 700,
                    }}
                  >
                    Loading cards…
                  </div>
                ) : sessionCards.length === 0 ? (
                  <div className="hist-empty">
                    No card data available for this session.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {sessionCards.map((c, i) => (
                      <div
                        key={c.flashcard_id}
                        style={{
                          background: c.correct ? "#f0fdf4" : "#fff5f5",
                          borderRadius: 12,
                          padding: "12px 16px",
                          borderLeft: `4px solid ${c.correct ? "#16a34a" : "#dc2626"}`,
                          opacity: c.deleted ? 0.5 : 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <p
                            style={{
                              fontWeight: 700,
                              fontSize: ".85rem",
                              color: "var(--ink)",
                            }}
                          >
                            {i + 1}.{" "}
                            {c.deleted ? (
                              <span
                                style={{
                                  color: "var(--ink3)",
                                  fontStyle: "italic",
                                }}
                              >
                                This flashcard has been deleted
                              </span>
                            ) : (
                              c.question
                            )}
                          </p>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: ".85rem",
                              color: c.correct ? "#16a34a" : "#dc2626",
                              marginLeft: 12,
                              flexShrink: 0,
                            }}
                          >
                            {c.correct ? "✓ Correct" : "✗ Wrong"}
                          </span>
                        </div>
                        {!c.deleted && (
                          <p
                            style={{ fontSize: ".8rem", color: "var(--ink2)" }}
                          >
                            {c.answer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : history.length === 0 ? (
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
                            history.find((s) => s.pct === bestPct)?.created_at,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="sess-list">
                    {history.map((s) => {
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
                        <div
                          className="sess-item"
                          key={s.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => viewSessionCards(s.id)}
                        >
                          <div className="sess-medal">{medal}</div>
                          <div className="sess-bar-wrap">
                            <div className="sess-top">
                              <span className="sess-date">
                                {new Date(s.created_at).toLocaleDateString(
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
                              ✓ {s.correct} correct · ✗ {s.wrong} wrong ·{" "}
                              {s.total} total
                              <span
                                style={{
                                  marginLeft: 8,
                                  color: "var(--teal-d)",
                                  fontWeight: 700,
                                }}
                              >
                                View cards →
                              </span>
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
