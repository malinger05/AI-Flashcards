import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../constants";
import { getHistory, addSession } from "../utils/storage";
import GenerateTab from "./GenerateTab";
import StudyTab from "./StudyTab";
import QuizTab from "./QuizTab";
import SavedTab from "./SavedTab";

export default function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState("generate");
  const [saved, setSaved] = useState([]);
  const [gen, setGen] = useState([]);
  const [customStudy, setCustomStudy] = useState(null);
  const [ddOpen, setDdOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const ddRef = useRef(null);

  // Load saved flashcards from DB on mount
  useEffect(() => {
    apiFetch("/flashcards")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSaved(data);
      })
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Save generated cards to DB
  async function persistSaved(cards) {
    try {
      const res = await apiFetch("/flashcards", {
        method: "POST",
        body: JSON.stringify(
          cards.map((c) => ({ question: c.question, answer: c.answer })),
        ),
      });
      const saved = await res.json();
      if (Array.isArray(saved)) setSaved((prev) => [...saved, ...prev]);
    } catch (e) {
      console.error("Failed to save flashcards", e);
    }
  }

  // Refresh saved list from DB (called after save)
  async function refreshSaved() {
    const res = await apiFetch("/flashcards");
    const data = await res.json();
    if (Array.isArray(data)) setSaved(data);
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

  const history = getHistory(user.id);
  const bestPct = history.length
    ? Math.max(...history.map((s) => s.pct))
    : null;
  const totalSessions = history.length;
  const totalCards = history.reduce((a, s) => a + s.total, 0);

  return (
    <div className="app-shell" onClick={() => setDdOpen(false)}>
      {/* TOP BAR */}
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
          {["generate", "study", "quiz", "saved"].map((t) => (
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

      {/* MAIN CONTENT */}
      <main className="content">
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
            userId={user.id}
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
              onStudySelected={startCustomStudy}
              onDelete={(id) =>
                setSaved((prev) => prev.filter((c) => c.id !== id))
              }
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
      </main>

      {/* PROFILE MODAL */}
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

      {/* HISTORY MODAL */}
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
