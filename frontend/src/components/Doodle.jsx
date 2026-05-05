export default function Doodle() {
  return (
    <div className="doodle">
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        <g opacity=".17" stroke="#0a5c59" fill="none" strokeWidth="2">
          <path d="M20 30Q40 10 60 30Q80 50 100 30" />
          <path d="M200 18Q220 0 240 18Q260 36 280 18" />
          <path d="M10 118Q30 100 50 118Q70 136 90 118" />
          <path d="M230 138Q250 120 270 138Q290 156 310 138" />
          <circle cx="300" cy="58" r="11" />
          <circle cx="160" cy="168" r="7" />
          <circle cx="14" cy="78" r="5" />
          <polygon points="148,9 158,27 138,27" />
          <polygon points="50,158 60,176 40,176" />
          <line x1="280" y1="98" x2="308" y2="126" />
          <line x1="280" y1="126" x2="308" y2="98" />
          <line x1="5" y1="148" x2="28" y2="172" />
          <line x1="5" y1="172" x2="28" y2="148" />
          <path d="M118 4Q128 14 118 24Q108 34 118 44" />
          <path d="M188 154Q198 164 188 174Q178 184 188 194" />
        </g>
      </svg>
    </div>
  );
}
