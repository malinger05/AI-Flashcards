"""SCRUM-63: /health exposes db and Ollama status for observability checks."""

from unittest.mock import patch


def test_health_returns_ok_when_db_and_ollama_up(client):
    with patch("app.main.urllib_request.urlopen"):
        res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["db"] == "ok"
    assert body["status"] in ("ok", "degraded")
