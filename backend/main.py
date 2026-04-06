from fastapi import FastAPI


app = FastAPI(title="AI Flashcard Generator API")

@app.get("/health")
def health_check():
    return {"status": "ok"}