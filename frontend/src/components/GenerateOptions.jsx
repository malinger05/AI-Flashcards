/** SCRUM-76: card count and difficulty selectors for generation. */

export const GENERATE_COUNTS = [5, 8, 10, 12, 15, 20];
export const GENERATE_DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export default function GenerateOptions({ count, difficulty, onCountChange, onDifficultyChange }) {
  return (
    <div className="gen-options">
      <div className="gen-opt">
        <label htmlFor="gen-count">Number of cards</label>
        <select
          id="gen-count"
          className="gen-opt-select"
          value={count}
          onChange={(e) => onCountChange(Number(e.target.value))}
        >
          {GENERATE_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="gen-opt">
        <label htmlFor="gen-difficulty">Difficulty</label>
        <select
          id="gen-difficulty"
          className="gen-opt-select"
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
        >
          {GENERATE_DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
