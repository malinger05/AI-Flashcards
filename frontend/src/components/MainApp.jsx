import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../constants";
import GenerateTab from "./GenerateTab";
import StudyTab from "./StudyTab";
import QuizTab from "./QuizTab";
import SavedTab from "./SavedTab";
import StatsTab from "./StatsTab";
import StudyGuideTab from "./StudyGuideTab";
import StatsStrip from "./StatsStrip";
import TabErrorBanner from "./TabErrorBanner";
import { TabLoading } from "./TabState";
import { exportFlashcardsJson } from "../utils/exportFlashcards";
import {
  getNetworkOrErrorMessage,
  parseApiResponse,
} from "../utils/apiErrors";

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
  const [dueStudy, setDueStudy] = useState(false);
  const [dueCards, setDueCards] = useState([]);
  const [ddOpen, setDdOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [loadingQuizHistory, setLoadingQuizHistory] = useState(true);
  const [loadError, setLoadError] = useState("");
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
  const [remediationQuiz, setRemediationQuiz] = useState(null);

  // S3-007: health check on mount
  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.ollama === "unreachable") setOllamaDown(true);
      })
      .catch(() => {});
  }, []);

  const refreshQuizHistory = useCallback(async () => {
    setLoadingQuizHistory(true);
    try {
      const data = await parseApiResponse(await apiFetch("/quiz/history"));
      if (Array.isArray(data)) setQuizHistory(data);
    } catch (e) {
      setLoadError((prev) => prev || getNetworkOrErrorMessage(e));
    } finally {
      setLoadingQuizHistory(false);
    }
  }, []);

  const loadBootstrap = useCallback(async () => {
    setLoadError("");
    setLoadingCards(true);
    setLoadingHistory(true);
    setLoadingQuizHistory(true);

    const errors = [];

    try {
      const data = await parseApiResponse(await apiFetch("/flashcards"));
      if (Array.isArray(data)) setSaved(data);
    } catch (e) {
      errors.push(getNetworkOrErrorMessage(e));
    } finally {
      setLoadingCards(false);
    }

    try {
      const data = await parseApiResponse(await apiFetch("/study/history"));
      if (Array.isArray(data)) setHistory(data);
    } catch (e) {
      errors.push(getNetworkOrErrorMessage(e));
    } finally {
      setLoadingHistory(false);
    }

    try {
      const data = await parseApiResponse(await apiFetch("/quiz/history"));
      if (Array.isArray(data)) setQuizHistory(data);
    } catch (e) {
      errors.push(getNetworkOrErrorMessage(e));
    } finally {
      setLoadingQuizHistory(false);
    }

    try {
      const data = await parseApiResponse(await apiFetch("/decks"));
      if (Array.isArray(data)) setDecks(data);
    } catch (e) {
      errors.push(getNetworkOrErrorMessage(e));
    }

    if (errors.length) setLoadError(errors[0]);
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  // SCRUM-80: load spaced-repetition queue for study mode
  useEffect(() => {
    apiFetch("/flashcards?due_only=true")
      .then(async (r) => {
        const data = await parseApiResponse(r);
        if (Array.isArray(data)) setDueCards(data);
      })
      .catch(() => {});
  }, [saved, history]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function persistSaved(cards) {
    const data = await parseApiResponse(
      await apiFetch("/flashcards", {
        method: "POST",
        body: JSON.stringify(
          cards.map((c) => ({ question: c.question, answer: c.answer })),
        ),
      }),
    );
    if (Array.isArray(data)) setSaved((prev) => [...data, ...prev]);
  }

  async function refreshSaved() {
    const data = await parseApiResponse(await apiFetch("/flashcards"));
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
    setDueStudy(false);
    setTab("study");
  }
  // SCRUM-80: open study tab with only cards due for spaced repetition review
  function startDueStudy() {
    setCustomStudy(null);
    setDueStudy(true);
    setTab("study");
  }
  function switchTab(t) {
    if (t !== "study") {
      setCustomStudy(null);
      setDueStudy(false);
    }
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

  const studyCards = dueStudy
    ? dueCards
    : customStudy ?? (gen.length ? gen : saved);
  const streak = computeStreak(history);
  const bestPct = history.length
    ? Math.max(...history.map((s) => s.pct))
    : null;
  const bestQuizPct = quizHistory.length
    ? Math.max(...quizHistory.map((s) => s.score_pct))
    : null;
  const lastQuiz = quizHistory[0] ?? null;

  const TABS = ["generate", "study", "quiz", "guide", "saved", "stats"];

  async function startRemediationQuiz() {
    try {
      const res = await apiFetch("/quiz/start-remediation", {
        method: "POST",
        body: JSON.stringify({ limit: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not start practice quiz.");
      setRemediationQuiz(data);
      switchTab("quiz");
    } catch (e) {
      alert(e.message);
    }
  }

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
              {t === "stats"
                ? "Stats"
                : t === "guide"
                  ? "Guide"
                  : t[0].toUpperCase() + t.slice(1)}
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
                {/* SCRUM-79: quiz history from GET /quiz/history */}
                <button
                  className="dd-btn"
                  onClick={() => {
                    setModal("quizHistory");
                    setDdOpen(false);
                    refreshQuizHistory();
                  }}
                >
                  <span className="dd-ico">📝</span> Quiz history
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
            className="ollama-banner"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
              padding: "10px 18px",
              background: "var(--surface-warn)",
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
        <TabErrorBanner
          message={loadError}
          onRetry={loadBootstrap}
          onDismiss={() => setLoadError("")}
        />
        <StatsStrip
          cardCount={saved.length}
          dueCount={dueCards.length}
          lastQuiz={lastQuiz}
          loadingCards={loadingCards}
          loadingQuiz={loadingQuizHistory}
          onDueClick={startDueStudy}
          onQuizHistoryClick={() => {
            setModal("quizHistory");
            refreshQuizHistory();
          }}
        />
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
        {tab === "study" && !dueStudy && dueCards.length > 0 && (
          <div style={{ padding: "0 1.25rem 0.5rem", maxWidth: 720, margin: "0 auto" }}>
            <button className="btn btn-violet" onClick={startDueStudy}>
              {/* SCRUM-80: spaced repetition — study cards whose next_review_at is due */}
              Review {dueCards.length} due card{dueCards.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
        {tab === "study" && dueStudy && (
          <div style={{ padding: "0.5rem 1.25rem 0", maxWidth: 720, margin: "0 auto" }}>
            <button
              type="button"
              className="btn"
              style={{ fontSize: ".85rem" }}
              onClick={() => setDueStudy(false)}
            >
              ← Back to all cards
            </button>
          </div>
        )}
        {tab === "study" &&
          (loadingCards ? (
            <TabLoading message="Loading your cards…" />
          ) : (
            <StudyTab
              cards={studyCards}
              dueOnly={dueStudy}
              customLabel={
                dueStudy
                  ? `${dueCards.length} due for review`
                  : customStudy
                    ? `${customStudy.length} selected cards`
                    : null
              }
              onSessionSaved={(session) => {
                onSessionSaved(session);
                refreshSaved();
              }}
            />
          ))}
        {tab === "quiz" &&
          (loadingCards ? (
            <TabLoading message="Loading your cards…" />
          ) : (
            <QuizTab
              savedCards={saved}
              remediationLaunch={remediationQuiz}
              onRemediationConsumed={() => setRemediationQuiz(null)}
              onOpenStudyGuide={() => switchTab("guide")}
              onQuizComplete={refreshQuizHistory}
            />
          ))}
        {tab === "guide" && (
          <StudyGuideTab
            ollamaDown={ollamaDown}
            onPracticeWeak={startRemediationQuiz}
          />
        )}
        {tab === "saved" &&
          (loadingCards ? (
            <TabLoading message="Loading your cards…" />
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
              onExport={(cardsToExport) =>
                exportFlashcardsJson(cardsToExport, "flashcards.json")
              }
              onImportSaved={async (cards) => {
                await persistSaved(cards);
                await refreshSaved();
              }}
            />
          ))}
        {tab === "stats" &&
          (loadingHistory ? (
            <TabLoading message="Loading your stats…" />
          ) : (
            <StatsTab history={history} saved={saved} streak={streak} />
          ))}
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
                    className="rbi profile-streak"
                    style={{
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
                        className={c.correct ? "sess-result ok" : "sess-result bad"}
                        style={{
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

      {/* SCRUM-79: quiz history modal — list of quiz sessions (GET /quiz/history) */}
      {modal === "quizHistory" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div
            className="modal"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="modal-title">Quiz history</span>
              <button className="modal-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {loadingQuizHistory ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--ink3)",
                    fontWeight: 700,
                  }}
                >
                  Loading quiz history…
                </div>
              ) : quizHistory.length === 0 ? (
                <div className="hist-empty">
                  <div style={{ fontSize: "2.5rem", marginBottom: ".75rem" }}>
                    📝
                  </div>
                  Complete a quiz to see your history here!
                </div>
              ) : (
                <>
                  {bestQuizPct !== null && (
                    <div className="hist-best">
                      <div className="hist-best-ico">🏆</div>
                      <div className="hist-best-info">
                        <div className="hist-best-label">Best quiz score</div>
                        <div className="hist-best-val">{bestQuizPct}%</div>
                        <div className="hist-best-sub">
                          {quizHistory.find((s) => s.score_pct === bestQuizPct)
                            ?.total ?? 0}{" "}
                          cards ·{" "}
                          {new Date(
                            quizHistory.find(
                              (s) => s.score_pct === bestQuizPct,
                            )?.created_at,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="sess-list">
                    {quizHistory.map((s) => {
                      const pct = s.score_pct;
                      const medal =
                        pct === 100
                          ? "🥇"
                          : pct >= 80
                            ? "🥈"
                            : pct >= 60
                              ? "🥉"
                              : "📝";
                      const fillColor =
                        pct >= 70
                          ? "#1a8a85"
                          : pct >= 50
                            ? "#f4845f"
                            : "#e05252";
                      return (
                        <div className="sess-item" key={s.id}>
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
                              <span className="sess-pct-lbl">{pct}%</span>
                            </div>
                            <div className="sess-track">
                              <div
                                className="sess-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: fillColor,
                                }}
                              />
                            </div>
                            <div className="sess-meta">
                              ✓ {s.correct} correct · ✗ {s.wrong} wrong ·{" "}
                              {s.total} total
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
