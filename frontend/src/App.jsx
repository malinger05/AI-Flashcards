import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [notes, setNotes] = useState("");
  const [generatedCards, setGeneratedCards] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  async function fetchSavedCards() {
    setLoadingSavedCards(true);
    try {
      const res = await fetch(`${API_BASE}/flashcards`);
      if (!res.ok) {
        throw new Error("Failed to fetch flashcards.");
      }
      const data = await res.json();
      setSavedCards(Array.isArray(data) ? data : []);
      setStatusMessage("Saved flashcards refreshed.");
    } catch (err) {
      setError(err.message || "Unexpected error while fetching flashcards.");
    } finally {
      setLoadingSavedCards(false);
    }
  }

  useEffect(() => {
    fetchSavedCards();
  }, []);

  async function handleGenerate() {
    setError("");
    setStatusMessage("");
    setLoadingGenerate(true);
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to generate flashcards.");
      }
      setGeneratedCards(Array.isArray(data.flashcards) ? data.flashcards : []);
      setStatusMessage("New flashcards generated.");
    } catch (err) {
      setError(err.message || "Unexpected error while generating flashcards.");
    } finally {
      setLoadingGenerate(false);
    }
  }

  async function handleSave() {
    if (!generatedCards.length) return;
    setError("");
    setStatusMessage("");
    setLoadingSave(true);
    try {
      const res = await fetch(`${API_BASE}/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatedCards),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to save flashcards.");
      }
      setGeneratedCards([]);
      setSavedCards((prev) => [...data, ...prev]);
      setStatusMessage("Flashcards saved successfully.");
    } catch (err) {
      setError(err.message || "Unexpected error while saving flashcards.");
    } finally {
      setLoadingSave(false);
    }
  }

  async function copyGeneratedCards() {
    if (!generatedCards.length) return;
    const text = generatedCards
      .map((card, idx) => `${idx + 1}. Q: ${card.question}\nA: ${card.answer}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage("Generated cards copied to clipboard.");
      setError("");
    } catch (_err) {
      setError("Could not copy to clipboard.");
    }
  }

  function exportSavedCards() {
    if (!savedCards.length) return;
    const content = JSON.stringify(savedCards, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saved-flashcards.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Saved flashcards exported as JSON.");
  }

  const filteredSavedCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return savedCards;
    return savedCards.filter((card) => {
      return card.question.toLowerCase().includes(query) || card.answer.toLowerCase().includes(query);
    });
  }, [savedCards, searchTerm]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <h1>AI Flashcard Generator</h1>
          <p className="muted">Turn your notes into clean, study-ready flashcards in seconds.</p>
        </div>
        <div className="stats">
          <div className="stat-card">
            <span className="stat-label">Generated</span>
            <strong>{generatedCards.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Saved</span>
            <strong>{savedCards.length}</strong>
          </div>
        </div>
      </header>

      <section className="panel">
        <h2>1) Input Notes</h2>
        <textarea
          placeholder="Paste lecture notes here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
        />
        <div className="actions">
          <button onClick={handleGenerate} disabled={loadingGenerate || notes.trim().length < 5}>
            {loadingGenerate ? "Generating..." : "Generate Flashcards"}
          </button>
          <button className="btn-secondary" onClick={() => setNotes("")} disabled={!notes.length || loadingGenerate}>
            Clear Notes
          </button>
        </div>
      </section>

      {!!error && <p className="error">{error}</p>}
      {!!statusMessage && <p className="status">{statusMessage}</p>}

      <section className="panel">
        <h2>2) Generated Flashcards</h2>
        <FlashcardList cards={generatedCards} emptyText="No generated flashcards yet." />
        <div className="actions">
          <button onClick={handleSave} disabled={loadingSave || !generatedCards.length}>
            {loadingSave ? "Saving..." : "Save Flashcards"}
          </button>
          <button className="btn-secondary" onClick={copyGeneratedCards} disabled={!generatedCards.length}>
            Copy All
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>3) Saved Flashcards</h2>
          <div className="actions">
            <button className="btn-secondary" onClick={fetchSavedCards} disabled={loadingSavedCards}>
              {loadingSavedCards ? "Refreshing..." : "Refresh"}
            </button>
            <button className="btn-secondary" onClick={exportSavedCards} disabled={!savedCards.length}>
              Export JSON
            </button>
          </div>
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="Search saved cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FlashcardList cards={filteredSavedCards} emptyText="No saved flashcards match your search." />
      </section>
    </main>
  );
}

function FlashcardList({ cards, emptyText }) {
  if (!cards.length) return <p>{emptyText}</p>;
  return (
    <ul className="card-list">
      {cards.map((card, idx) => (
        <li key={card.id ?? `${card.question}-${idx}`} className="card">
          <p>
            <strong>Q:</strong> {card.question}
          </p>
          <p>
            <strong>A:</strong> {card.answer}
          </p>
        </li>
      ))}
    </ul>
  );
}
