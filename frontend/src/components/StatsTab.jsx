import { useMemo, useRef, useState } from "react";
import Doodle from "./Doodle";
import { apiFetch } from "../constants";

// ── Edit Card Modal ───────────────────────────────────────────────────────────
function EditCardModal({ card, onSave, onClose }) {
  const [q, setQ] = useState(card.question);
  const [a, setA] = useState(card.answer);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!q.trim() || !a.trim()) return;
    setSaving(true);
    await onSave(card.id, q.trim(), a.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => onClose(), 700);
  }

  const charLimitQ = 300;
  const charLimitA = 500;
  const qPct = Math.min((q.length / charLimitQ) * 100, 100);
  const aPct = Math.min((a.length / charLimitA) * 100, 100);
  const dirty =
    q.trim() !== card.question.trim() || a.trim() !== card.answer.trim();

  return (
    <div className="ecm-overlay" onClick={onClose}>
      <div className="ecm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ecm-header">
          <div className="ecm-header-left">
            <div className="ecm-header-icon">✏️</div>
            <div>
              <h2 className="ecm-title">Edit flashcard</h2>
              <p className="ecm-subtitle">Changes sync to your account</p>
            </div>
          </div>
          <button className="ecm-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Live preview */}
        <div className="ecm-preview-strip">
          <div className="ecm-preview-card ecm-preview-q">
            <span className="ecm-preview-lbl">Q</span>
            <p className="ecm-preview-txt">{q || "Question preview…"}</p>
          </div>
          <div className="ecm-preview-arrow">→</div>
          <div className="ecm-preview-card ecm-preview-a">
            <span className="ecm-preview-lbl">A</span>
            <p className="ecm-preview-txt">{a || "Answer preview…"}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="ecm-body">
          <div className="ecm-field">
            <div className="ecm-field-top">
              <label className="ecm-label">
                <span className="ecm-badge ecm-badge-q">Q</span>
                Question
              </label>
              <span
                className={
                  "ecm-char-count" +
                  (q.length > charLimitQ * 0.9 ? " warn" : "") +
                  (q.length >= charLimitQ ? " over" : "")
                }
              >
                {q.length}/{charLimitQ}
              </span>
            </div>
            <div className="ecm-textarea-wrap">
              <textarea
                className="ecm-textarea"
                rows={3}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What do you want to be asked?"
                maxLength={charLimitQ}
                autoFocus
              />
              <div className="ecm-bar">
                <div
                  className="ecm-bar-fill ecm-bar-q"
                  style={{ width: qPct + "%" }}
                />
              </div>
            </div>
          </div>

          <div className="ecm-sep">
            <div className="ecm-sep-line" />
            <span className="ecm-sep-ico">↓</span>
            <div className="ecm-sep-line" />
          </div>

          <div className="ecm-field">
            <div className="ecm-field-top">
              <label className="ecm-label">
                <span className="ecm-badge ecm-badge-a">A</span>
                Answer
              </label>
              <span
                className={
                  "ecm-char-count" +
                  (a.length > charLimitA * 0.9 ? " warn" : "") +
                  (a.length >= charLimitA ? " over" : "")
                }
              >
                {a.length}/{charLimitA}
              </span>
            </div>
            <div className="ecm-textarea-wrap">
              <textarea
                className="ecm-textarea"
                rows={4}
                value={a}
                onChange={(e) => setA(e.target.value)}
                placeholder="What is the correct answer?"
                maxLength={charLimitA}
              />
              <div className="ecm-bar">
                <div
                  className="ecm-bar-fill ecm-bar-a"
                  style={{ width: aPct + "%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ecm-footer">
          <button
            className="ecm-btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className={
              "ecm-btn-save" +
              (saved ? " saved" : "") +
              (!dirty ? " unchanged" : "")
            }
            onClick={save}
            disabled={saving || !q.trim() || !a.trim() || !dirty}
          >
            {saved ? (
              "✓ Saved!"
            ) : saving ? (
              <>
                <span className="spin" /> Saving…
              </>
            ) : (
              "💾 Save changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Deck Sidebar ──────────────────────────────────────────────────────────────
function DeckSidebar({ decks, activeDeck, onSelect, onCreate, onDelete }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  function submit() {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setCreating(false);
  }

  return (
    <div className="deck-sidebar">
      <div className="deck-header">Decks</div>
      <button
        className={`deck-item${activeDeck === null ? " active" : ""}`}
        onClick={() => onSelect(null)}
      >
        📚 All cards
      </button>
      {decks.map((d) => (
        <div key={d.id} className="deck-item-row">
          <button
            className={`deck-item${activeDeck === d.id ? " active" : ""}`}
            onClick={() => onSelect(d.id)}
          >
            🗂 {d.name}
            {d.card_count > 0 && (
              <span className="deck-count">{d.card_count}</span>
            )}
          </button>
          <button
            className="deck-del-btn"
            title="Delete deck"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(d.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
      {creating ? (
        <div className="deck-new-form">
          <input
            className="deck-new-input"
            placeholder="Deck name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setCreating(false);
            }}
            autoFocus
          />
          <div className="row" style={{ gap: 4, marginTop: 4 }}>
            <button
              className="btn btn-teal"
              style={{ fontSize: ".75rem", padding: "4px 10px" }}
              onClick={submit}
            >
              Add
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: ".75rem", padding: "4px 10px" }}
              onClick={() => setCreating(false)}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button className="deck-add-btn" onClick={() => setCreating(true)}>
          + New deck
        </button>
      )}
    </div>
  );
}

// ── PDF / Image Import ────────────────────────────────────────────────────────
function ImportPanel({ onGenerated }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setErr("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${window.__API_BASE__ || "http://127.0.0.1:8000"}/generate/file`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("fc_token")}`,
          },
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed.");
      if (!Array.isArray(data.flashcards) || !data.flashcards.length)
        throw new Error("No flashcards extracted. Try a clearer image or PDF.");
      onGenerated(data.flashcards);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="import-panel">
      <div className="import-inner">
        <span className="import-icon">📄</span>
        <div>
          <p className="import-title">Import from PDF or image</p>
          <p className="import-sub">
            Upload a photo of notes, a PDF, or a screenshot
          </p>
        </div>
        <label
          className={`btn btn-ghost import-btn${loading ? " disabled" : ""}`}
        >
          {loading ? (
            <>
              <span className="spin" /> Extracting…
            </>
          ) : (
            "Choose file"
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: "none" }}
            onChange={handleFile}
            disabled={loading}
          />
        </label>
      </div>
      {err && (
        <p className="msg-err" style={{ marginTop: ".5rem" }}>
          {err}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SavedTab({
  cards,
  decks,
  onExport,
  onStudySelected,
  onDelete,
  onEdit,
  onCreateDeck,
  onAddToDeck,
  onDeleteDeck,
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeDeck, setActiveDeck] = useState(null);
  const [deckPickFor, setDeckPickFor] = useState(null); // card ids to add to deck
  const [showImport, setShowImport] = useState(false);
  const [importedCards, setImportedCards] = useState([]);
  const [savingImport, setSavingImport] = useState(false);

  // Filter by deck and search
  const filtered = useMemo(() => {
    let list = cards;
    if (activeDeck !== null) {
      const deck = decks.find((d) => d.id === activeDeck);
      if (deck?.flashcard_ids) {
        const ids = new Set(deck.flashcard_ids);
        list = list.filter((c) => ids.has(c.id));
      } else {
        list = [];
      }
    }
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (c) =>
        c.question.toLowerCase().includes(s) ||
        c.answer.toLowerCase().includes(s),
    );
  }, [cards, decks, q, activeDeck]);

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

  async function deleteSelected() {
    for (const id of selected) {
      setDeleting(id);
      try {
        await apiFetch(`/flashcards/${id}`, { method: "DELETE" });
        onDelete(id);
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
    setDeleting(null);
    clearSelection();
  }

  async function addSelectedToDeck(deckId) {
    const ids = deckPickFor ?? [...selected];
    await onAddToDeck(deckId, ids);
    setDeckPickFor(null);
    clearSelection();
  }

  async function saveImportedCards() {
    if (!importedCards.length) return;
    setSavingImport(true);
    try {
      const res = await apiFetch("/flashcards", {
        method: "POST",
        body: JSON.stringify(
          importedCards.map((c) => ({
            question: c.question,
            answer: c.answer,
          })),
        ),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        // Notify parent through a window event (MainApp handles the actual state)
        window.dispatchEvent(
          new CustomEvent("fc-cards-saved", { detail: data }),
        );
      }
      setImportedCards([]);
      setShowImport(false);
    } finally {
      setSavingImport(false);
    }
  }

  const selCount = selected.size;

  return (
    <div className="tab-pane">
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        {/* Deck sidebar */}
        <DeckSidebar
          decks={decks}
          activeDeck={activeDeck}
          onSelect={setActiveDeck}
          onCreate={onCreateDeck}
          onDelete={onDeleteDeck}
        />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">
                {activeDeck !== null
                  ? (decks.find((d) => d.id === activeDeck)?.name ?? "Deck")
                  : "Saved flashcards"}{" "}
                <span className="pill">{filtered.length}</span>
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
                  onClick={() => setShowImport((v) => !v)}
                >
                  📄 Import
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={onExport}
                  disabled={!cards.length}
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Import panel */}
            {showImport && (
              <div style={{ marginBottom: "1rem" }}>
                <ImportPanel
                  onGenerated={(cards) => {
                    setImportedCards(cards);
                  }}
                />
                {importedCards.length > 0 && (
                  <div className="import-preview">
                    <p className="import-preview-title">
                      {importedCards.length} cards extracted — review then save:
                    </p>
                    <div className="pgrid" style={{ marginBottom: ".75rem" }}>
                      {importedCards.map((c, i) => (
                        <div className="pcard" key={i}>
                          <div className="pnum">{i + 1}</div>
                          <div>
                            <p className="pq">Q: {c.question}</p>
                            <p className="pa">A: {c.answer}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="row">
                      <button
                        className="btn btn-teal"
                        onClick={saveImportedCards}
                        disabled={savingImport}
                      >
                        {savingImport
                          ? "Saving…"
                          : `Save ${importedCards.length} cards`}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setImportedCards([])}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                💡 Click cards to select — then study, add to a deck, or delete
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
              {filtered.map((c) => {
                const id = c.id;
                const sel = selected.has(id);
                const editing = editingId === id;
                return (
                  <div
                    className={`scard teal-card${sel ? " selected" : ""}${editing ? " editing" : ""}`}
                    key={id}
                    onClick={() => {
                      if (!editing) toggleCard(id);
                    }}
                  >
                    {!editing && (
                      <div className="sel-check">{sel ? "✓" : ""}</div>
                    )}
                    <Doodle />
                    {editing ? (
                      <CardEditor
                        card={c}
                        onSave={async (id, q, a) => {
                          await onEdit(id, q, a);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="scard-in">
                        <div>
                          <p className="sq">{c.question}</p>
                          <p className="sa">{c.answer}</p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          {c.created_at && (
                            <p className="sdt">
                              {new Date(c.created_at).toLocaleDateString()}
                            </p>
                          )}
                          <button
                            className="card-edit-btn"
                            title="Edit card"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(id);
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deck picker modal */}
      {(deckPickFor !== null || (selCount > 0 && false)) && (
        <div className="modal-overlay" onClick={() => setDeckPickFor(null)}>
          <div
            className="modal"
            style={{ maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="modal-title">Add to deck</span>
              <button
                className="modal-close"
                onClick={() => setDeckPickFor(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {decks.length === 0 ? (
                <p style={{ color: "var(--ink3)", fontSize: ".88rem" }}>
                  No decks yet. Create one in the sidebar.
                </p>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {decks.map((d) => (
                    <button
                      key={d.id}
                      className="btn btn-ghost"
                      style={{
                        justifyContent: "flex-start",
                        textAlign: "left",
                      }}
                      onClick={() => addSelectedToDeck(d.id)}
                    >
                      🗂 {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selection action bar */}
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
            {decks.length > 0 && (
              <button
                className="btn btn-ghost"
                onClick={() => setDeckPickFor([...selected])}
              >
                🗂 Add to deck
              </button>
            )}
            <button
              className="btn btn-ghost"
              style={{ color: "#c0392b", borderColor: "#c0392b" }}
              disabled={deleting !== null}
              onClick={deleteSelected}
            >
              {deleting !== null ? "Deleting…" : `Delete ${selCount}`}
            </button>
            <button className="btn btn-violet" onClick={studySelected}>
              ▶ Study {selCount} card{selCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Deck picker modal (triggered from sel-bar) */}
      {deckPickFor !== null && (
        <div className="modal-overlay" onClick={() => setDeckPickFor(null)}>
          <div
            className="modal"
            style={{ maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="modal-title">Add to deck</span>
              <button
                className="modal-close"
                onClick={() => setDeckPickFor(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {decks.length === 0 ? (
                <p style={{ color: "var(--ink3)", fontSize: ".88rem" }}>
                  No decks yet. Create one in the sidebar.
                </p>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {decks.map((d) => (
                    <button
                      key={d.id}
                      className="btn btn-ghost"
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => addSelectedToDeck(d.id)}
                    >
                      🗂 {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit card modal */}
      {editingId !== null &&
        (() => {
          const card = cards.find((c) => c.id === editingId);
          return card ? (
            <EditCardModal
              card={card}
              onSave={onEdit}
              onClose={() => setEditingId(null)}
            />
          ) : null;
        })()}
    </div>
  );
}
