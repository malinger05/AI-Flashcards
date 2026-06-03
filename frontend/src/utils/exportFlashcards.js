/** SCRUM-74: download flashcards as a JSON file (question/answer or full card objects). */
export function exportFlashcardsJson(cards, filename = "flashcards.json") {
  if (!cards?.length) return;
  const payload = cards.map((c) =>
    c.id != null
      ? {
          id: c.id,
          question: c.question,
          answer: c.answer,
          deck: c.deck,
          correct_count: c.correct_count,
          wrong_count: c.wrong_count,
          next_review_at: c.next_review_at,
          review_step: c.review_step,
          created_at: c.created_at,
        }
      : { question: c.question, answer: c.answer },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
