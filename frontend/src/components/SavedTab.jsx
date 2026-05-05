import { useMemo, useState } from "react";
import Doodle from "./Doodle";

export default function SavedTab({ cards, onExport, onStudySelected }) {
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
