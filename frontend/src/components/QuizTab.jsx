import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../constants";

export default function QuizTab({ savedCards }) {
  const [phase, setPhase] = useState("setup");
  const [count, setCount] = useState(10);
  const [useSelected, setUseSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [totalCards, setTotalCards] = useState(0);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isLast, setIsLast] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const inputRef = useRef(null);

  useEffect(() => {
    if (phase === "question") inputRef.current?.focus();
  }, [phase, cardIndex]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter") {
        if (phase === "question" && answer.trim()) submitAnswer();
        if (phase === "feedback") nextCard();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function startQuiz() {
    setLoading(true);
    setErr("");
    try {
      const ids = useSelected && selectedIds.size > 0 ? [...selectedIds] : [];
      const res = await apiFetch("/quiz/start", {
        method: "POST",
        body: JSON.stringify({ flashcard_ids: ids, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not start quiz.");
      setSessionId(data.session_id);
      setQuestion(data.question);
      setCardIndex(data.card_index);
      setTotalCards(data.total_cards);
      setAnswer("");
      setFeedback(null);
      setSummary(null);
      setPhase("question");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // SCRUM-92: POST /quiz/answer — backend grades with llama3.2 (verdict + reason in feedback)
  async function submitAnswer() {
    if (!answer.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch("/quiz/answer", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, user_answer: answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not submit answer.");
      setFeedback(data);
      setIsLast(data.is_last);
      setPhase("feedback");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function nextCard() {
    if (isLast) {
      setLoading(true);
      try {
        const res = await apiFetch(`/quiz/${sessionId}/summary`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Could not load summary.");
        setSummary(data);
        setPhase("summary");
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/quiz/${sessionId}/next`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not load next card.");
      setQuestion(data.question);
      setCardIndex(data.card_index);
      setTotalCards(data.total_cards);
      setAnswer("");
      setFeedback(null);
      setPhase("question");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase("setup");
    setErr("");
    setSummary(null);
    setFeedback(null);
    setAnswer("");
    setSelectedIds(new Set());
  }

  const progressPct =
    totalCards > 0
      ? Math.round(
          ((cardIndex + (phase === "feedback" ? 1 : 0)) / totalCards) * 100,
        )
      : 0;

  // ── Verdict helpers ───────────────────────────────────────────────────────
  function verdictClass(fb) {
    if (!fb) return "";
    if (fb.verdict === "correct") return "correct";
    if (fb.verdict === "partial") return "partial";
    return "wrong";
  }

  function verdictLabel(fb) {
    if (!fb) return "";
    if (fb.verdict === "correct") return "✓ Correct!";
    if (fb.verdict === "partial") return "◑ Partially correct";
    return "✗ Not quite";
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === "setup")
    return (
      <div className="tab-pane center-pane">
        <div className="quiz-start-card">
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📝</div>
          <h2>Quiz Mode</h2>
          <p>
            Type your answers — AI judges them by meaning, not exact wording.
            <br />
            Cards you miss more often appear more frequently.
          </p>
          <div className="quiz-count-row">
            <label htmlFor="qcount">Cards to quiz:</label>
            <select
              id="qcount"
              className="quiz-count-select"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[5, 8, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {savedCards.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "center",
                  fontSize: ".88rem",
                  fontWeight: 700,
                  color: "var(--ink2)",
                  cursor: "pointer",
                  marginBottom: ".75rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={useSelected}
                  onChange={(e) => {
                    setUseSelected(e.target.checked);
                    setSelectedIds(new Set());
                  }}
                />
                Choose specific cards
              </label>
              {useSelected && (
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    textAlign: "left",
                  }}
                >
                  {savedCards.map((c, i) => {
                    const id = c.id ?? i;
                    const sel = selectedIds.has(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleSelect(id)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: sel
                            ? "2px solid var(--violet)"
                            : "2px solid var(--teal-l)",
                          background: sel ? "#f3f2ff" : "var(--teal-ll)",
                          cursor: "pointer",
                          fontSize: ".8rem",
                          fontWeight: 700,
                          color: "var(--ink)",
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            color: sel ? "var(--violet)" : "var(--teal-d)",
                          }}
                        >
                          {sel ? "✓" : "○"}
                        </span>
                        {c.question.length > 60
                          ? c.question.slice(0, 60) + "…"
                          : c.question}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {err && <p className="msg-err">{err}</p>}
          <button
            className="btn btn-teal lg"
            style={{ width: "100%" }}
            onClick={startQuiz}
            disabled={loading || savedCards.length === 0}
          >
            {loading ? (
              <>
                <span className="spin" /> Starting…
              </>
            ) : (
              "▶ Start Quiz"
            )}
          </button>
          {savedCards.length === 0 && (
            <p
              style={{
                fontSize: ".78rem",
                color: "var(--ink3)",
                marginTop: ".75rem",
                fontWeight: 600,
              }}
            >
              Save some flashcards first to use Quiz mode.
            </p>
          )}
        </div>
      </div>
    );

  // ── Summary ───────────────────────────────────────────────────────────────
  if (phase === "summary" && summary) {
    const pct = summary.score_pct;
    return (
      <div className="tab-pane center-pane">
        <div className="quiz-summary">
          <div
            className="quiz-pct"
            style={{ color: pct >= 70 ? "#0a7c5c" : "#b91c1c" }}
          >
            {pct}%
          </div>
          <p>
            {pct === 100
              ? "Perfect score! 🎉"
              : pct >= 80
                ? "Excellent! 🌟"
                : pct >= 60
                  ? "Good job! 💪"
                  : "Keep practising! 📚"}
          </p>
          <div className="rbreak">
            <div className="rbi r">
              <span className="rval">{summary.correct_count}</span>
              <span className="rlbl">Correct</span>
            </div>
            <div className="rbi w">
              <span className="rval">{summary.wrong_count}</span>
              <span className="rlbl">Wrong</span>
            </div>
            <div className="rbi t">
              <span className="rval">{summary.total_cards}</span>
              <span className="rlbl">Total</span>
            </div>
          </div>
          <button
            className="btn btn-teal"
            style={{ marginRight: 8 }}
            onClick={startQuiz}
          >
            Try again
          </button>
          <button className="btn btn-ghost" onClick={reset}>
            Back to setup
          </button>
        </div>
      </div>
    );
  }

  // ── Question / Feedback ───────────────────────────────────────────────────
  return (
    <div className="tab-pane">
      <div className="smeta">
        <span className="sctr">
          Card {cardIndex + 1} / {totalCards}
        </span>
      </div>
      <div className="prog">
        <div className="progf" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="quiz-card-panel">
        <p
          style={{
            fontSize: ".7rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            color: "var(--teal-d)",
            marginBottom: ".6rem",
          }}
        >
          Question {cardIndex + 1}
        </p>
        <p className="quiz-q">{question}</p>
        <div className="quiz-input-row">
          <input
            ref={inputRef}
            className="quiz-ans-input"
            type="text"
            placeholder="Type your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={phase === "feedback" || loading}
          />
          {phase === "question" && (
            <button
              className="btn btn-teal"
              onClick={submitAnswer}
              disabled={loading || !answer.trim()}
            >
              {loading ? <span className="spin" /> : "Submit"}
            </button>
          )}
        </div>
        {err && <p className="msg-err">{err}</p>}

        {phase === "feedback" && feedback && (
          <div className={`feedback-box ${verdictClass(feedback)}`}>
            <p className="feedback-verdict">{verdictLabel(feedback)}</p>

            {/* AI reason — shown for partial and wrong */}
            {feedback.reason && feedback.verdict !== "correct" && (
              <p className="feedback-reason">{feedback.reason}</p>
            )}

            <p className="feedback-ans">
              <strong>Correct answer:</strong> {feedback.correct_answer}
            </p>
            {feedback.verdict !== "correct" && (
              <p className="feedback-ans" style={{ marginTop: 4 }}>
                <strong>Your answer:</strong> {feedback.user_answer}
              </p>
            )}
          </div>
        )}

        {phase === "feedback" && (
          <button
            className="btn btn-teal"
            style={{ width: "100%", marginTop: ".25rem" }}
            onClick={nextCard}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spin" /> Loading…
              </>
            ) : isLast ? (
              "See results →"
            ) : (
              "Next question →"
            )}
          </button>
        )}
      </div>
      <p
        style={{
          textAlign: "center",
          fontSize: ".72rem",
          color: "var(--ink3)",
          marginTop: ".5rem",
          fontWeight: 600,
        }}
      >
        Press Enter to submit · Enter again to navigate
      </p>
    </div>
  );
}
