import { useState } from "react";
import { apiFetch } from "../constants";

export default function GenerateTab({ gen, setGen, onSave, onStudy }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function generate() {
    if (notes.trim().length < 5) return;
    setLoading(true);
    setErr("");
    setOk("");
    try {
      const res = await apiFetch("/generate", {
        method: "POST",
        body: JSON.stringify({ text: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed.");
      if (!Array.isArray(data.flashcards) || !data.flashcards.length)
        throw new Error(
          "No flashcards returned. Try adding more detail to your notes.",
        );
      setGen(data.flashcards);
      setOk(`${data.flashcards.length} flashcards generated!`);
    } catch (e) {
      setErr(
        e.message ||
          "Could not connect to backend. Make sure it's running on port 8000.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tab-pane">
      <div className="panel">
        <div className="panel-title">
          <span className="step">1</span> Paste your notes
        </div>
        <textarea
          className="notes-area"
          rows={7}
          placeholder="Paste lecture notes, textbook passages, or any study material here…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="row">
          <button
            className="btn btn-teal"
            onClick={generate}
            disabled={loading || notes.trim().length < 5}
          >
            {loading ? (
              <>
                <span className="spin" /> Generating…
              </>
            ) : (
              "✨ Generate flashcards"
            )}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setNotes("");
              setGen([]);
              setErr("");
              setOk("");
            }}
          >
            Clear
          </button>
        </div>
        {err && <p className="msg-err">{err}</p>}
        {ok && <p className="msg-ok">{ok}</p>}
      </div>

      {gen.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <span className="step">2</span> {gen.length} cards generated{" "}
              <span className="pill">{gen.length}</span>
            </div>
            <div className="row">
              <button className="btn btn-teal" onClick={() => onSave(gen)}>
                Save all
              </button>
              <button className="btn btn-ghost" onClick={onStudy}>
                Study now →
              </button>
            </div>
          </div>
          <div className="pgrid">
            {gen.map((c, i) => (
              <div className="pcard" key={i}>
                <div className="pnum">{i + 1}</div>
                <div>
                  <p className="pq">Q: {c.question}</p>
                  <p className="pa">A: {c.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
