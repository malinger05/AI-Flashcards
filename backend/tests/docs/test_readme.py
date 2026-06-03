"""SCRUM-86: root README documents setup and test commands."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def test_readme_exists_and_covers_setup():
    readme = ROOT / "README.md"
    assert readme.is_file()
    text = readme.read_text(encoding="utf-8")
    assert "Backend setup" in text
    assert "Frontend setup" in text
    assert "Ollama" in text
    assert "pytest" in text
