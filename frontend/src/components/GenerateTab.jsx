import { useRef, useState } from "react";
import { apiFetch } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = window.__API_BASE__ || "http://127.0.0.1:8000";

async function apiFetchFile(path, formData) {
  const token = localStorage.getItem("fc_token");
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
}

function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview grid of generated cards
// ─────────────────────────────────────────────────────────────────────────────

function CardPreview({ cards, onSave, onStudy }) {
  return (
    <div style={css.previewWrap}>
      <div style={css.previewHeader}>
        <div style={css.previewMeta}>
          <span style={css.previewCount}>{cards.length}</span>
          <span style={css.previewLabel}>flashcards ready</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={css.btnGhost} onClick={onStudy}>
            Study now →
          </button>
          <button style={css.btnTeal} onClick={() => onSave(cards)}>
            💾 Save all
          </button>
        </div>
      </div>

      <div style={css.previewGrid}>
        {cards.map((c, i) => (
          <div
            key={i}
            style={{
              ...css.previewCard,
              animationDelay: `${i * 40}ms`,
            }}
          >
            <div style={css.previewCardNum}>{i + 1}</div>
            <div style={css.previewCardQ}>
              <span style={css.qlbl}>Q</span>
              {c.question}
            </div>
            <div style={css.previewCardDivider} />
            <div style={css.previewCardA}>
              <span style={css.albl}>A</span>
              {c.answer}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Text mode
// ─────────────────────────────────────────────────────────────────────────────

function TextMode({ onGenerated }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const charLimit = 25000;
  const pct = Math.min((notes.length / charLimit) * 100, 100);
  const tooShort = notes.trim().length < 5;

  async function generate() {
    if (tooShort) return;
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch("/generate", {
        method: "POST",
        body: JSON.stringify({ text: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed.");
      if (!Array.isArray(data.flashcards) || !data.flashcards.length)
        throw new Error("No flashcards returned. Try adding more detail.");
      onGenerated(data.flashcards);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={css.modeBody}>
      <p style={css.modeHint}>
        Paste lecture notes, textbook content, or any study material. The AI
        will extract the key concepts and build flashcards automatically.
      </p>

      <div style={css.textareaWrap}>
        <textarea
          style={css.textarea}
          className="gen-ta"
          rows={10}
          placeholder="Paste your notes here… (minimum 5 characters)"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setErr("");
          }}
        />
        <div style={css.charBar}>
          <div
            style={{
              ...css.charBarFill,
              width: `${pct}%`,
              background: pct > 90 ? "#e05252" : "#1a8a85",
            }}
          />
        </div>
        <div style={css.charCount}>
          <span style={{ color: pct > 90 ? "#e05252" : "var(--ink3)" }}>
            {notes.length.toLocaleString()} / {charLimit.toLocaleString()}{" "}
            characters
          </span>
        </div>
      </div>

      {err && <div style={css.errBox}>{err}</div>}

      <button
        style={{
          ...css.btnTeal,
          ...css.generateBtn,
          opacity: loading || tooShort ? 0.6 : 1,
        }}
        onClick={generate}
        disabled={loading || tooShort}
      >
        {loading ? (
          <>
            <span style={css.spinnerInline} className="spin" /> Generating
            flashcards…
          </>
        ) : (
          <>
            <span>✨</span> Generate flashcards
          </>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document mode (PDF)
// ─────────────────────────────────────────────────────────────────────────────

function DocumentMode({ onGenerated }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function pickFile(f) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setErr("Only PDF files are supported.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setErr("File too large (max 20 MB).");
      return;
    }
    setFile(f);
    setErr("");
  }

  async function generate() {
    if (!file) return;
    setLoading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetchFile("/generate/file", fd);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Extraction failed.");
      if (!Array.isArray(data.flashcards) || !data.flashcards.length)
        throw new Error("No flashcards extracted. Try a text-based PDF.");
      onGenerated(data.flashcards);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={css.modeBody}>
      <p style={css.modeHint}>
        Upload a PDF — lecture slides, textbook chapters, study guides. The AI
        reads the text and builds targeted flashcards from it.
      </p>

      {/* Drop zone */}
      <div
        style={{
          ...css.dropZone,
          ...(dragging ? css.dropZoneActive : {}),
          ...(file ? css.dropZoneHasFile : {}),
        }}
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: "none" }}
          onChange={(e) => pickFile(e.target.files[0])}
        />

        {file ? (
          <div style={css.fileInfo}>
            <div style={css.fileIcon}>📄</div>
            <div style={css.fileDetails}>
              <span style={css.fileName}>{file.name}</span>
              <span style={css.fileSize}>{fileSize(file.size)}</span>
            </div>
            <button
              style={css.fileRemove}
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setErr("");
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={css.dropInner}>
            <div style={css.dropIconWrap}>
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#1a8a85" }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <p style={css.dropTitle}>Drop your PDF here</p>
            <p style={css.dropSub}>
              or <span style={css.dropLink}>click to browse</span> · max 20 MB
            </p>
          </div>
        )}
      </div>

      {err && <div style={css.errBox}>{err}</div>}

      <button
        style={{
          ...css.btnTeal,
          ...css.generateBtn,
          opacity: loading || !file ? 0.6 : 1,
        }}
        onClick={generate}
        disabled={loading || !file}
      >
        {loading ? (
          <>
            <span className="spin" style={css.spinnerInline} /> Extracting &amp;
            generating…
          </>
        ) : (
          <>
            <span>📄</span> Generate from PDF
          </>
        )}
      </button>

      <p style={css.tipText}>
        💡 Works best with text-based PDFs. Scanned documents may not extract
        correctly.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Image mode
// ─────────────────────────────────────────────────────────────────────────────

function ImageMode({ onGenerated }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function pickFile(f) {
    if (!f) return;
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
    ];
    if (
      !allowed.includes(f.type) &&
      !f.name.match(/\.(jpg|jpeg|png|webp|gif|heic)$/i)
    ) {
      setErr("Please upload a JPG, PNG, WebP, or HEIC image.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setErr("Image too large (max 15 MB).");
      return;
    }
    setFile(f);
    setErr("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }

  function clear() {
    setFile(null);
    setPreview(null);
    setErr("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function generate() {
    if (!file) return;
    setLoading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetchFile("/generate/file", fd);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Image extraction failed.");
      if (!Array.isArray(data.flashcards) || !data.flashcards.length)
        throw new Error("Could not extract flashcards. Try a clearer photo.");
      onGenerated(data.flashcards);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={css.modeBody}>
      <p style={css.modeHint}>
        Take a photo of your handwritten notes, a textbook page, or a
        whiteboard. The AI reads the content and turns it into flashcards —
        works with handwriting too.
      </p>

      {/* Drop zone */}
      <div
        style={{
          ...css.dropZone,
          ...(dragging ? css.dropZoneActive : {}),
          ...(preview
            ? {
                ...css.dropZoneHasFile,
                padding: 0,
                overflow: "hidden",
                cursor: "default",
              }
            : {}),
        }}
        onClick={() => !preview && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => pickFile(e.target.files[0])}
        />

        {preview ? (
          <div style={css.imgPreviewWrap}>
            <img src={preview} alt="Uploaded" style={css.imgPreview} />
            <div style={css.imgOverlay}>
              <div style={css.imgMeta}>
                <span style={css.imgName}>{file.name}</span>
                <span style={css.imgSize}>{fileSize(file.size)}</span>
              </div>
              <button
                style={css.imgRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
              >
                ✕ Remove
              </button>
            </div>
            {/* Scanning animation overlay when loading */}
            {loading && (
              <div style={css.scanOverlay}>
                <div style={css.scanLine} className="scan-line" />
                <div style={css.scanText}>Analysing image…</div>
              </div>
            )}
          </div>
        ) : (
          <div style={css.dropInner}>
            <div style={css.dropIconWrap}>
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#1a8a85" }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p style={css.dropTitle}>Drop your image here</p>
            <p style={css.dropSub}>
              or <span style={css.dropLink}>click to browse</span> · JPG, PNG,
              WebP, HEIC
            </p>
            <div style={css.imgExamples}>
              {[
                "📓 Handwritten notes",
                "📖 Textbook pages",
                "🖊️ Whiteboard photos",
                "📸 Printed slides",
              ].map((t) => (
                <span key={t} style={css.imgExample}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {err && <div style={css.errBox}>{err}</div>}

      <button
        style={{
          ...css.btnTeal,
          ...css.generateBtn,
          opacity: loading || !file ? 0.6 : 1,
        }}
        onClick={generate}
        disabled={loading || !file}
      >
        {loading ? (
          <>
            <span className="spin" style={css.spinnerInline} /> Analysing image…
          </>
        ) : (
          <>
            <span>🔍</span> Extract &amp; generate
          </>
        )}
      </button>

      <p style={css.tipText}>
        💡 Requires a vision-capable Ollama model (e.g.{" "}
        <code style={css.code}>llava</code>). Set{" "}
        <code style={css.code}>OLLAMA_VISION_MODEL</code> in your backend
        environment.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const MODES = [
  {
    id: "text",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="15" y1="12" x2="3" y2="12" />
        <line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    ),
    label: "Text",
    desc: "Paste notes or any text",
  },
  {
    id: "document",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    label: "Document",
    desc: "Upload a PDF file",
  },
  {
    id: "image",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    label: "Image",
    desc: "Photo of notes or a page",
  },
];

export default function GenerateTab({ gen, setGen, onSave, onStudy }) {
  const [mode, setMode] = useState("text");
  const [generated, setGenerated] = useState(gen || []);

  function handleGenerated(cards) {
    setGenerated(cards);
    setGen(cards);
  }

  function handleSave(cards) {
    onSave(cards);
    setGenerated([]);
    setGen([]);
  }

  function handleStudy() {
    onStudy();
  }

  return (
    <div style={css.root}>
      <style>{`
        @keyframes fadeUp   { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:none } }
        @keyframes cardIn   { from { opacity:0;transform:translateY(10px) scale(.98) } to { opacity:1;transform:none } }
        @keyframes scanMove { from { top:0 } to { top:calc(100% - 3px) } }
        .gen-ta { font-family:inherit; }
        .gen-ta:focus { outline:none; border-color:#1a8a85 !important; box-shadow:0 0 0 3px rgba(26,138,133,.16) !important; }
        .mode-tab:hover { background:var(--teal-ll,#e6f4f3) !important; }
        .mode-tab-active { background:linear-gradient(135deg,#0a5c59,#1a8a85) !important; color:#fff !important; border-color:transparent !important; }
        .mode-tab-active svg { stroke:#fff !important; }
        .mode-tab-active .mode-desc { color:rgba(255,255,255,.7) !important; }
        .gen-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(10,92,89,.28) !important; }
        .gen-btn:active:not(:disabled) { transform:translateY(0); }
        .scan-line { animation: scanMove 1.6s ease-in-out infinite alternate; }
      `}</style>

      <div style={css.container}>
        {/* ── Header ── */}
        <div style={css.header}>
          <h2 style={css.heading}>Generate Flashcards</h2>
          <p style={css.subheading}>
            Choose your source material — paste text, upload a PDF, or
            photograph your notes.
          </p>
        </div>

        {/* ── Mode tabs ── */}
        <div style={css.modeRow}>
          {MODES.map((m, i) => (
            <button
              key={m.id}
              className={`mode-tab${mode === m.id ? " mode-tab-active" : ""}`}
              onClick={() => {
                setMode(m.id);
                setGenerated([]);
              }}
              style={{
                ...css.modeTab,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <span style={css.modeIcon}>{m.icon}</span>
              <span style={css.modeTabInner}>
                <span style={css.modeTabLabel}>{m.label}</span>
                <span className="mode-desc" style={css.modeDesc}>
                  {m.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* ── Mode content ── */}
        <div style={css.panel} key={mode}>
          <div style={{ animation: "fadeUp .25s ease" }}>
            {mode === "text" && <TextMode onGenerated={handleGenerated} />}
            {mode === "document" && (
              <DocumentMode onGenerated={handleGenerated} />
            )}
            {mode === "image" && <ImageMode onGenerated={handleGenerated} />}
          </div>
        </div>

        {/* ── Generated cards ── */}
        {generated.length > 0 && (
          <div style={{ animation: "fadeUp .3s ease .05s both" }}>
            <CardPreview
              cards={generated}
              onSave={handleSave}
              onStudy={handleStudy}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles (design-token-aware, uses CSS vars from the app's stylesheet)
// ─────────────────────────────────────────────────────────────────────────────

const css = {
  root: {
    padding: "0 0 3rem",
  },
  container: {
    maxWidth: 760,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },

  // Header
  header: {
    textAlign: "center",
    padding: "1rem 0 .25rem",
    animation: "fadeUp .3s ease",
  },
  heading: {
    margin: 0,
    fontWeight: 900,
    fontSize: "1.6rem",
    color: "var(--ink)",
    letterSpacing: "-.02em",
  },
  subheading: {
    margin: ".5rem 0 0",
    fontSize: ".9rem",
    color: "var(--ink3)",
    fontWeight: 600,
    lineHeight: 1.55,
  },

  // Mode tabs
  modeRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "0.75rem",
    animation: "fadeUp .3s ease .06s both",
  },
  modeTab: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.9rem 1.1rem",
    borderRadius: 14,
    border: "1.5px solid var(--teal-ll, #d4ecea)",
    background: "var(--card, #fff)",
    cursor: "pointer",
    textAlign: "left",
    transition:
      "background .17s, border-color .17s, transform .15s, box-shadow .17s",
    fontFamily: "inherit",
    boxShadow: "0 2px 8px rgba(10,92,89,.05)",
    animation: "fadeUp .3s ease both",
  },
  modeIcon: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "var(--teal-ll, #e6f4f3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabInner: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  modeTabLabel: {
    fontSize: ".88rem",
    fontWeight: 800,
    color: "var(--ink)",
    lineHeight: 1,
  },
  modeDesc: {
    fontSize: ".7rem",
    fontWeight: 600,
    color: "var(--ink3)",
    lineHeight: 1.2,
  },

  // Panel
  panel: {
    background: "var(--card, #fff)",
    border: "1.5px solid var(--teal-ll, #d4ecea)",
    borderRadius: 20,
    padding: "1.75rem",
    boxShadow: "0 4px 20px rgba(10,92,89,.07)",
    animation: "fadeUp .3s ease .1s both",
  },

  // Mode body (shared)
  modeBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  },
  modeHint: {
    margin: 0,
    fontSize: ".87rem",
    color: "var(--ink2)",
    fontWeight: 600,
    lineHeight: 1.6,
    padding: "0.75rem 1rem",
    background: "var(--teal-ll, #e6f4f3)",
    borderRadius: 10,
    borderLeft: "3px solid #1a8a85",
  },

  // Textarea
  textareaWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1.5px solid var(--teal-ll, #d4ecea)",
    borderRadius: "12px 12px 0 0",
    padding: "14px 16px",
    fontSize: ".9rem",
    fontWeight: 600,
    color: "var(--ink)",
    background: "var(--card, #fff)",
    resize: "vertical",
    lineHeight: 1.65,
    transition: "border-color .15s, box-shadow .15s",
    minHeight: 200,
  },
  charBar: {
    height: 4,
    background: "var(--teal-ll, #e6f4f3)",
    borderRadius: "0 0 0 0",
    overflow: "hidden",
  },
  charBarFill: {
    height: "100%",
    transition: "width .3s, background .3s",
    borderRadius: 0,
  },
  charCount: {
    padding: "5px 14px 0",
    fontSize: ".7rem",
    fontWeight: 700,
    display: "flex",
    justifyContent: "flex-end",
  },

  // Drop zone
  dropZone: {
    border: "2px dashed var(--teal-ll, #b0d8d5)",
    borderRadius: 16,
    background: "var(--teal-ll, #f0faf9)",
    minHeight: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color .2s, background .2s, box-shadow .2s",
    position: "relative",
    overflow: "hidden",
  },
  dropZoneActive: {
    borderColor: "#1a8a85",
    background: "#e0f5f3",
    boxShadow: "0 0 0 4px rgba(26,138,133,.12)",
  },
  dropZoneHasFile: {
    border: "2px solid #1a8a85",
    background: "var(--card, #fff)",
    cursor: "default",
  },
  dropInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
    padding: "1.5rem",
    textAlign: "center",
  },
  dropIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: "var(--card, #fff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(10,92,89,.1)",
    marginBottom: "0.25rem",
  },
  dropTitle: {
    margin: 0,
    fontWeight: 800,
    fontSize: "1rem",
    color: "var(--ink)",
  },
  dropSub: {
    margin: 0,
    fontSize: ".82rem",
    fontWeight: 600,
    color: "var(--ink3)",
  },
  dropLink: {
    color: "#1a8a85",
    fontWeight: 800,
    cursor: "pointer",
  },

  // File info (PDF picked)
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1.25rem 1.5rem",
    width: "100%",
  },
  fileIcon: {
    fontSize: "2rem",
    flexShrink: 0,
  },
  fileDetails: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  fileName: {
    fontWeight: 800,
    fontSize: ".9rem",
    color: "var(--ink)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileSize: {
    fontSize: ".75rem",
    fontWeight: 600,
    color: "var(--ink3)",
  },
  fileRemove: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1.5px solid var(--teal-ll, #d4ecea)",
    background: "transparent",
    color: "var(--ink2)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: ".85rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },

  // Image preview
  imgExamples: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    justifyContent: "center",
    marginTop: "0.35rem",
  },
  imgExample: {
    fontSize: ".7rem",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 99,
    background: "var(--card, #fff)",
    color: "var(--ink2)",
    border: "1px solid var(--teal-ll, #d4ecea)",
  },
  imgPreviewWrap: {
    position: "relative",
    width: "100%",
  },
  imgPreview: {
    width: "100%",
    maxHeight: 300,
    objectFit: "cover",
    display: "block",
  },
  imgOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%)",
    padding: "2rem 1.25rem 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  imgMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  imgName: {
    fontSize: ".82rem",
    fontWeight: 800,
    color: "#fff",
    textShadow: "0 1px 4px rgba(0,0,0,.4)",
  },
  imgSize: {
    fontSize: ".72rem",
    fontWeight: 600,
    color: "rgba(255,255,255,.7)",
  },
  imgRemove: {
    padding: "5px 12px",
    borderRadius: 8,
    border: "none",
    background: "rgba(255,255,255,.2)",
    backdropFilter: "blur(6px)",
    color: "#fff",
    fontWeight: 700,
    fontSize: ".78rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  scanOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(10,92,89,.25)",
    backdropFilter: "blur(2px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    background: "linear-gradient(90deg, transparent, #5eeee8, transparent)",
    boxShadow: "0 0 16px 4px #1a8a85",
  },
  scanText: {
    fontSize: ".88rem",
    fontWeight: 800,
    color: "#fff",
    background: "rgba(10,92,89,.7)",
    padding: "6px 16px",
    borderRadius: 99,
    letterSpacing: ".04em",
  },

  // Buttons
  btnTeal: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "11px 22px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #1a8a85 0%, #0a5c59 100%)",
    color: "#fff",
    fontWeight: 800,
    fontSize: ".9rem",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "transform .15s, box-shadow .15s, opacity .15s",
    boxShadow: "0 4px 14px rgba(10,92,89,.22)",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "11px 20px",
    borderRadius: 12,
    border: "1.5px solid var(--teal-ll, #d4ecea)",
    background: "transparent",
    color: "var(--ink2)",
    fontWeight: 700,
    fontSize: ".88rem",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background .15s",
  },
  generateBtn: {
    width: "100%",
    justifyContent: "center",
    padding: "14px 22px",
    fontSize: ".95rem",
    borderRadius: 14,
  },
  spinnerInline: {
    display: "inline-block",
  },

  // Tips
  tipText: {
    margin: 0,
    fontSize: ".75rem",
    fontWeight: 600,
    color: "var(--ink3)",
    lineHeight: 1.5,
  },
  code: {
    fontFamily: "monospace",
    background: "var(--teal-ll, #e6f4f3)",
    padding: "1px 5px",
    borderRadius: 4,
    fontSize: ".85em",
    color: "#0a5c59",
  },
  errBox: {
    padding: "10px 14px",
    borderRadius: 10,
    background: "#fff5f5",
    border: "1.5px solid #fecaca",
    color: "#b91c1c",
    fontSize: ".85rem",
    fontWeight: 700,
  },

  // Preview
  previewWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.5rem",
    background: "var(--card, #fff)",
    borderRadius: 16,
    border: "1.5px solid var(--teal-ll, #d4ecea)",
    boxShadow: "0 2px 10px rgba(10,92,89,.06)",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  previewMeta: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  previewCount: {
    fontSize: "2rem",
    fontWeight: 900,
    color: "#1a8a85",
    lineHeight: 1,
  },
  previewLabel: {
    fontSize: ".9rem",
    fontWeight: 700,
    color: "var(--ink2)",
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "0.75rem",
  },
  previewCard: {
    background: "var(--card, #fff)",
    border: "1.5px solid var(--teal-ll, #d4ecea)",
    borderRadius: 16,
    padding: "1rem 1.1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    boxShadow: "0 2px 10px rgba(10,92,89,.05)",
    position: "relative",
    animation: "cardIn .35s ease both",
  },
  previewCardNum: {
    position: "absolute",
    top: 10,
    right: 12,
    fontSize: ".68rem",
    fontWeight: 900,
    color: "var(--ink3)",
    background: "var(--teal-ll, #e6f4f3)",
    width: 22,
    height: 22,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCardQ: {
    fontSize: ".85rem",
    fontWeight: 700,
    color: "var(--ink)",
    lineHeight: 1.5,
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-start",
    paddingRight: 28,
  },
  previewCardDivider: {
    height: 1,
    background: "var(--teal-ll, #e6f4f3)",
    margin: "0 -0.25rem",
  },
  previewCardA: {
    fontSize: ".82rem",
    fontWeight: 600,
    color: "var(--ink2)",
    lineHeight: 1.5,
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-start",
  },
  qlbl: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: 6,
    background: "#0a5c59",
    color: "#fff",
    fontSize: ".65rem",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  albl: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: 6,
    background: "var(--teal-ll, #c6e8e6)",
    color: "#0a5c59",
    fontSize: ".65rem",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
};
