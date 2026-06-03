# AI Flashcards

Full-stack flashcard app: generate cards from notes (text, PDF, or images) with a local **Ollama** model, study with spaced repetition, and run AI-graded quizzes.

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Ollama** with models pulled, e.g. `ollama pull llama3.2` and optionally `ollama pull llava` for images

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt   # optional, for pytest

cp ../env.example .env    # or copy backend/.env.example if present
# Edit .env: OLLAMA_BASE_URL, OLLAMA_MODEL, LOG_LEVEL, SESSION_MAX_AGE_DAYS

uvicorn app.main:app --reload --port 8000
```

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Health check: `GET /health` (database + Ollama status).

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server proxies API calls to the backend on port **8000** (see `frontend/src/constants.js`).

## Running tests

**Backend** (from `backend/`):

```bash
pytest
```

**Frontend** (from `frontend/`):

```bash
npm test
```

## Main features

| Area | Description |
|------|-------------|
| Generate | Text / PDF / image → flashcards via Ollama |
| Study | Swipe deck; **due cards** use `next_review_at` spaced repetition |
| Quiz | AI answer grading (llama3.2) with fuzzy fallback |
| Saved | Decks, edit/delete, import |
| Auth | Register, login, session expiry, change password |

## Environment variables

See [`env.example`](env.example) for `LOG_LEVEL`, `OLLAMA_*`, `SESSION_MAX_AGE_DAYS`, and `GENERATE_RATE_LIMIT`.

## Project layout

```
backend/app/     FastAPI app (main.py, ai.py, quiz_grader.py, …)
frontend/src/    React + Vite UI
flashcards.db    SQLite database (created on first run)
```
