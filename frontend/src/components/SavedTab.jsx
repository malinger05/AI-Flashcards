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

  const canSave = dirty && !saving && !saved && q.trim() && a.trim();

  return (
    <>
      <style>{`
        @keyframes ecmFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes ecmSlideUp { from { opacity:0;transform:translateY(22px) scale(.96) } to { opacity:1;transform:none } }
        .ecm-ta:focus { border-color:#1a8a85 !important; box-shadow:0 0 0 3px rgba(26,138,133,.18) !important; outline:none; }
        .ecm-cancel:hover { background:var(--teal-ll,#e6f4f3) !important; }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(5,32,31,.58)",
          backdropFilter: "blur(7px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          animation: "ecmFadeIn .18s ease",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--card,#fff)",
            borderRadius: 24,
            boxShadow:
              "0 28px 90px rgba(5,32,31,.24),0 4px 18px rgba(5,32,31,.1)",
            width: "100%",
            maxWidth: 560,
            maxHeight: "92vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            animation: "ecmSlideUp .24s cubic-bezier(.34,1.3,.64,1)",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: "1.5px solid var(--teal-ll,#d4ecea)",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  flexShrink: 0,
                  background: "linear-gradient(135deg,#e6f4f3,#c6e8e6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.35rem",
                }}
              >
                ✏️
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 900,
                    fontSize: "1.05rem",
                    color: "var(--ink)",
                  }}
                >
                  Edit flashcard
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: ".74rem",
                    fontWeight: 600,
                    color: "var(--ink3)",
                  }}
                >
                  Changes sync to your account
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1.5px solid var(--teal-ll,#d4ecea)",
                background: "transparent",
                cursor: "pointer",
                fontSize: ".9rem",
                color: "var(--ink2)",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Live preview ── */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "stretch",
              padding: "1rem 1.5rem",
              background:
                "linear-gradient(to bottom,var(--teal-ll,#e6f4f3) 0%,transparent 100%)",
            }}
          >
            <div
              style={{
                flex: 1,
                borderRadius: 14,
                padding: "0.8rem 1rem",
                minWidth: 0,
                background: "linear-gradient(135deg,#0a5c59 0%,#1a8a85 100%)",
                boxShadow: "0 4px 14px rgba(10,92,89,.22)",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: ".62rem",
                  fontWeight: 900,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,.6)",
                }}
              >
                Question
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: ".83rem",
                  fontWeight: 600,
                  color: "#fff",
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {q || <em style={{ opacity: 0.6 }}>Question preview…</em>}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--ink3)",
                fontSize: "1.1rem",
                flexShrink: 0,
              }}
            >
              →
            </div>
            <div
              style={{
                flex: 1,
                borderRadius: 14,
                padding: "0.8rem 1rem",
                minWidth: 0,
                background: "linear-gradient(135deg,#1e3a6e 0%,#2563c4 100%)",
                boxShadow: "0 4px 14px rgba(30,58,110,.22)",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: ".62rem",
                  fontWeight: 900,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,.6)",
                }}
              >
                Answer
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: ".83rem",
                  fontWeight: 600,
                  color: "#fff",
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {a || <em style={{ opacity: 0.6 }}>Answer preview…</em>}
              </p>
            </div>
          </div>

          {/* ── Fields ── */}
          <div
            style={{
              padding: "0.5rem 1.5rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* Question */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 800,
                    fontSize: ".84rem",
                    color: "var(--ink)",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "#0a5c59",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: ".7rem",
                      fontWeight: 900,
                    }}
                  >
                    Q
                  </span>
                  Question
                </label>
                <span
                  style={{
                    fontSize: ".7rem",
                    fontWeight: 700,
                    color:
                      q.length >= charLimitQ
                        ? "#c0392b"
                        : q.length > charLimitQ * 0.9
                          ? "#e67e22"
                          : "var(--ink3)",
                  }}
                >
                  {q.length}/{charLimitQ}
                </span>
              </div>
              <textarea
                className="ecm-ta"
                rows={3}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What do you want to be asked?"
                maxLength={charLimitQ}
                autoFocus
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1.5px solid var(--teal-ll,#d4ecea)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: ".88rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  background: "var(--card,#fff)",
                  resize: "vertical",
                  lineHeight: 1.55,
                  fontFamily: "inherit",
                  transition: "border-color .15s,box-shadow .15s",
                }}
              />
              <div
                style={{
                  height: 3,
                  borderRadius: 99,
                  marginTop: 4,
                  background: "var(--teal-ll,#e6f4f3)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${qPct}%`,
                    borderRadius: 99,
                    background: "#1a8a85",
                    transition: "width .3s",
                  }}
                />
              </div>
            </div>

            {/* Separator */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--teal-ll,#d4ecea)",
                }}
              />
              <span
                style={{
                  fontSize: ".85rem",
                  color: "var(--ink3)",
                  fontWeight: 700,
                }}
              >
                ↓
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--teal-ll,#d4ecea)",
                }}
              />
            </div>

            {/* Answer */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 800,
                    fontSize: ".84rem",
                    color: "var(--ink)",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "#1e3a6e",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: ".7rem",
                      fontWeight: 900,
                    }}
                  >
                    A
                  </span>
                  Answer
                </label>
                <span
                  style={{
                    fontSize: ".7rem",
                    fontWeight: 700,
                    color:
                      a.length >= charLimitA
                        ? "#c0392b"
                        : a.length > charLimitA * 0.9
                          ? "#e67e22"
                          : "var(--ink3)",
                  }}
                >
                  {a.length}/{charLimitA}
                </span>
              </div>
              <textarea
                className="ecm-ta"
                rows={4}
                value={a}
                onChange={(e) => setA(e.target.value)}
                placeholder="What is the correct answer?"
                maxLength={charLimitA}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1.5px solid var(--teal-ll,#d4ecea)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: ".88rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  background: "var(--card,#fff)",
                  resize: "vertical",
                  lineHeight: 1.55,
                  fontFamily: "inherit",
                  transition: "border-color .15s,box-shadow .15s",
                }}
              />
              <div
                style={{
                  height: 3,
                  borderRadius: 99,
                  marginTop: 4,
                  background: "var(--teal-ll,#e6f4f3)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${aPct}%`,
                    borderRadius: 99,
                    background: "#2563c4",
                    transition: "width .3s",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "1rem 1.5rem 1.25rem",
              borderTop: "1.5px solid var(--teal-ll,#d4ecea)",
            }}
          >
            <button
              className="ecm-cancel"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: ".87rem",
                border: "1.5px solid var(--teal-ll,#d4ecea)",
                background: "transparent",
                color: "var(--ink2)",
                cursor: "pointer",
                transition: "background .15s",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              style={{
                padding: "9px 22px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: ".87rem",
                border: "none",
                fontFamily: "inherit",
                background: saved
                  ? "linear-gradient(135deg,#16a34a,#15803d)"
                  : canSave
                    ? "linear-gradient(135deg,#1a8a85,#0a5c59)"
                    : "var(--teal-ll,#d4ecea)",
                color: canSave || saved ? "#fff" : "var(--ink3)",
                cursor: canSave ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background .2s",
              }}
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
    </>
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
