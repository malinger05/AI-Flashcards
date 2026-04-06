import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [notes, setNotes] = useState("");
  const [generatedCards, setGeneratedCards] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState("");

  async function fetchSavedCards() {
    try {
      const res = await fetch(`${API_BASE}/flashcards`);
      if (!res.ok) {
        throw new Error("Failed to fetch flashcards.");
      }
      const data = await res.json();
      setSavedCards(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unexpected error while fetching flashcards.");
    }
  }

  useEffect(() => {
    fetchSavedCards();
  }, []);

  async function handleGenerate() {
    setError("");
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
    } catch (err) {
      setError(err.message || "Unexpected error while generating flashcards.");
    } finally {
      setLoadingGenerate(false);
    }
  }

  async function handleSave() {
    if (!generatedCards.length) return;
    setError("");
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
    } catch (err) {
      setError(err.message || "Unexpected error while saving flashcards.");
    } finally {
      setLoadingSave(false);
    }
  }

  return (
    <main className="container">
      <h1>AI Flashcard Generator</h1>

      <section className="panel">
        <h2>1) Paste your notes</h2>
        <textarea
          placeholder="Paste lecture notes here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
        />
        <button onClick={handleGenerate} disabled={loadingGenerate || notes.trim().length < 5}>
          {loadingGenerate ? "Generating..." : "Generate Flashcards"}
        </button>
      </section>

      {!!error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>2) Generated flashcards</h2>
        <FlashcardList cards={generatedCards} emptyText="No generated flashcards yet." />
        <button onClick={handleSave} disabled={loadingSave || !generatedCards.length}>
          {loadingSave ? "Saving..." : "Save Flashcards"}
        </button>
      </section>

      <section className="panel">
        <h2>3) Saved flashcards</h2>
        <FlashcardList cards={savedCards} emptyText="No saved flashcards yet." />
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
