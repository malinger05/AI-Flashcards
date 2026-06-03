# Study Guide & Remediation Quiz — QA Checklist (SCRUM-109)

Manual verification for epic SCRUM-101.

## Prerequisites

- Backend running (`uvicorn app.main:app --reload --port 8000`)
- Frontend running (`npm run dev`)
- Ollama running with `llama3.2` (or `OLLAMA_MODEL`) pulled
- Logged-in user with saved flashcards

## Checklist

- [ ] Complete a quiz with at least 2 wrong or partial answers
- [ ] Open **Guide** tab — weak cards listed with verdict/reason
- [ ] Click **Generate AI tips** (Ollama up) — summary and per-card tips appear
- [ ] Stop Ollama (`ollama stop` or kill process) — clear error, app does not crash
- [ ] Click **Practice weak areas** — quiz starts with only weak cards
- [ ] Finish remediation quiz — scores update in quiz flow
- [ ] After quiz score &lt; 70%, **Open Study Guide** button appears on summary
- [ ] Backend logs include `study_guide_ok` / `study_guide_start` and `remediation_quiz_start`
- [ ] `pytest backend/tests/study_guide/` passes

## API smoke tests

```bash
# Weak cards (needs auth token)
curl -H "Authorization: Bearer TOKEN" http://127.0.0.1:8000/study-guide/weak-cards

# Study guide (Ollama required)
curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"limit":3}' http://127.0.0.1:8000/study-guide

# Remediation quiz
curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"limit":5}' http://127.0.0.1:8000/quiz/start-remediation
```
