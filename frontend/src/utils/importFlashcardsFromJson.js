/** SCRUM-75: parse and validate flashcards from a JSON file. */

function normalizeCard(raw, index) {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Item ${index + 1} must be an object with question and answer.`);
  }
  const question = String(raw.question ?? "").trim();
  const answer = String(raw.answer ?? "").trim();
  if (!question || !answer) {
    throw new Error(
      `Item ${index + 1} is missing a non-empty question or answer.`,
    );
  }
  return { question, answer };
}

export async function parseFlashcardsJsonFile(file) {
  if (!file) throw new Error("No file selected.");
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file. Export from this app or use an array of { question, answer } objects.");
  }

  let items = parsed;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if (Array.isArray(parsed.flashcards)) items = parsed.flashcards;
    else if (Array.isArray(parsed.cards)) items = parsed.cards;
    else throw new Error("JSON must be an array of cards or an object with a flashcards array.");
  }

  if (!Array.isArray(items) || !items.length) {
    throw new Error("JSON file contains no flashcards.");
  }

  return items.map((item, i) => normalizeCard(item, i));
}
