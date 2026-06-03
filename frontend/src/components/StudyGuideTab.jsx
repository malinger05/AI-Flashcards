import { useEffect, useState } from "react";
import { apiFetch } from "../constants";
import { TabEmpty, TabLoading } from "./TabState";

export default function StudyGuideTab({ ollamaDown, onPracticeWeak }) {
  const [weakCards, setWeakCards] = useState([]);
  const [guide, setGuide] = useState(null);
  const [loadingWeak, setLoadingWeak] = useState(true);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoadingWeak(true);
    setErr("");
    apiFetch("/study-guide/weak-cards?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWeakCards(data);
      })
      .catch(() => setErr("Could not load weak areas."))
      .finally(() => setLoadingWeak(false));
  }, []);

  async function generateGuide() {
    if (ollamaDown) {
      setErr("Ollama is offline — start Ollama to generate AI study tips.");
      return;
    }
    if (!weakCards.length) {
      setErr("Complete a quiz and miss some answers first.");
      return;
    }
    setLoadingGuide(true);
    setErr("");
    setGuide(null);
    try {
      const res = await apiFetch("/study-guide", {
        method: "POST",
        body: JSON.stringify({ limit: Math.min(5, weakCards.length) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Study guide failed.");
      setGuide(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingGuide(false);
    }
  }

  const hasSuggestions =
    guide &&
    (Boolean(guide.summary) ||
      (Array.isArray(guide.cards) && guide.cards.length > 0));

  function clearSuggestions() {
    setGuide(null);
    setErr("");
  }

  const tipsById = guide
    ? Object.fromEntries(guide.cards.map((c) => [c.flashcard_id, c]))
    : {};

  return (
    <div className="tab-pane" style={{ maxWidth: 720, margin: "0 auto", padding: "1rem 1.25rem 2rem" }}>
      <h2 style={{ margin: "0 0 0.5rem", fontWeight: 900 }}>Study Guide</h2>
      <p style={{ color: "var(--ink3)", fontWeight: 600, marginBottom: "1.25rem" }}>
        Personalized tips from your quiz mistakes (powered by Ollama).
      </p>

      {err && (
        <div className="err-banner" style={{ marginBottom: "1rem" }}>
          {err}
        </div>
      )}

      {loadingWeak ? (
        <TabLoading message="Loading weak areas…" />
      ) : weakCards.length === 0 ? (
        <TabEmpty
          icon="📖"
          title="No weak areas yet"
          message="Take a quiz and miss some answers — we'll highlight what to review and generate AI tips."
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <button
              className="btn btn-teal"
              onClick={generateGuide}
              disabled={loadingGuide || ollamaDown}
            >
              {loadingGuide ? "Generating…" : "✨ Generate AI tips"}
            </button>
            <button
              className="btn btn-violet"
              onClick={() => onPracticeWeak?.()}
              title={weakCards.length ? "Quiz on weak cards only" : "No weak cards"}
            >
              Practice weak areas
            </button>
            {hasSuggestions && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={clearSuggestions}
                disabled={loadingGuide}
                title="Remove generated tips and summary"
              >
                Clear suggestions
              </button>
            )}
          </div>

          {guide?.summary && (
            <div
              style={{
                background: "var(--teal-ll)",
                border: "1.5px solid var(--teal-l)",
                borderRadius: 14,
                padding: "1rem 1.15rem",
                marginBottom: "1.25rem",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {guide.summary}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {weakCards.map((c) => {
              const tip = tipsById[c.flashcard_id];
              return (
                <div
                  key={c.flashcard_id}
                  className="card-preview"
                  style={{
                    background: "var(--bg2)",
                    border: "1.5px solid var(--teal-ll)",
                    borderRadius: 14,
                    padding: "1rem 1.1rem",
                  }}
                >
                  <p style={{ margin: "0 0 0.35rem", fontWeight: 800, color: "var(--ink)" }}>
                    {c.question}
                  </p>
                  <p style={{ margin: 0, fontSize: ".85rem", color: "var(--ink3)", fontWeight: 600 }}>
                    Answer: {c.answer}
                    {c.last_verdict && (
                      <> · Last: <strong>{c.last_verdict}</strong></>
                    )}
                  </p>
                  {c.grader_reason && !tip && (
                    <p style={{ margin: "0.5rem 0 0", fontSize: ".82rem", color: "var(--ink3)" }}>
                      {c.grader_reason}
                    </p>
                  )}
                  {tip && (
                    <ul style={{ margin: "0.65rem 0 0", paddingLeft: "1.2rem", fontWeight: 600 }}>
                      {tip.tips.map((t, i) => (
                        <li key={i} style={{ marginBottom: "0.35rem" }}>{t}</li>
                      ))}
                    </ul>
                  )}
                  {tip?.mnemonic && (
                    <p style={{ margin: "0.5rem 0 0", fontStyle: "italic", color: "var(--teal-d)" }}>
                      💡 {tip.mnemonic}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
