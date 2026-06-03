/** SCRUM-84: dashboard stats strip — saved cards, due review, last quiz. */

export default function StatsStrip({
  cardCount,
  dueCount,
  lastQuiz,
  loadingCards,
  loadingQuiz,
  onDueClick,
  onQuizHistoryClick,
}) {
  const lastQuizLabel = (() => {
    if (loadingQuiz) return "…";
    if (!lastQuiz) return "No quizzes yet";
    const date = new Date(lastQuiz.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${lastQuiz.score_pct}% · ${date}`;
  })();

  return (
    <div className="stats-strip" aria-label="Dashboard stats">
      <div className="stats-strip-cell">
        <span className="stats-strip-val">
          {loadingCards ? "…" : cardCount}
        </span>
        <span className="stats-strip-lbl">Cards saved</span>
      </div>
      <button
        type="button"
        className={`stats-strip-cell stats-strip-action${dueCount > 0 ? " highlight" : ""}`}
        onClick={dueCount > 0 ? onDueClick : undefined}
        disabled={!dueCount}
        title={dueCount > 0 ? "Review due cards" : "No cards due for review"}
      >
        <span className="stats-strip-val">
          {loadingCards ? "…" : dueCount}
        </span>
        <span className="stats-strip-lbl">Due for review</span>
      </button>
      <button
        type="button"
        className="stats-strip-cell stats-strip-action"
        onClick={onQuizHistoryClick}
        title="View quiz history"
      >
        <span className="stats-strip-val stats-strip-quiz">{lastQuizLabel}</span>
        <span className="stats-strip-lbl">Last quiz</span>
      </button>
    </div>
  );
}
