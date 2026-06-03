import { useMemo } from "react";
import { TabEmpty } from "./TabState";

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBar({ pct, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 99,
          background: "var(--teal-ll, #e6f4f3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width .6s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
      <span style={{ fontSize: ".75rem", fontWeight: 800, color: "var(--ink2)", minWidth: 32, textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1.5px solid var(--teal-ll, #d4ecea)",
        borderRadius: 18,
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 2px 12px rgba(10,92,89,.06)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: accent ?? "var(--teal-ll, #e6f4f3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
          {label}
        </div>
        <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "var(--ink)", lineHeight: 1.15 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--ink3)", marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Session history row ───────────────────────────────────────────────────────
function SessionRow({ session, index }) {
  const medal = session.pct === 100 ? "🥇" : session.pct >= 80 ? "🥈" : session.pct >= 60 ? "🥉" : "📚";
  const fillColor = session.pct >= 70 ? "#1a8a85" : session.pct >= 50 ? "#f4845f" : "#e05252";
  const date = new Date(session.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "14px 16px",
        background: "var(--bg2)",
        borderRadius: 14,
        border: "1.5px solid var(--teal-ll, #d4ecea)",
        boxShadow: "0 1px 6px rgba(10,92,89,.04)",
        animation: `fadeUp .3s ease both`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <span style={{ fontSize: "1.4rem" }}>{medal}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--ink2)" }}>{date}</span>
          <span style={{ fontSize: ".9rem", fontWeight: 900, color: fillColor }}>{session.pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "var(--teal-ll, #e6f4f3)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${session.pct}%`, background: fillColor, borderRadius: 99 }} />
        </div>
        <div style={{ marginTop: 5, fontSize: ".72rem", fontWeight: 600, color: "var(--ink3)" }}>
          ✓ {session.correct} correct · ✗ {session.wrong} wrong · {session.total} total
        </div>
      </div>
    </div>
  );
}

// ── Activity calendar (last 30 days) ─────────────────────────────────────────
function ActivityGrid({ sessions }) {
  const days = 35;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const countByDay = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      const d = new Date(s.created_at);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [sessions]);

  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = countByDay[key] || 0;
    cells.push({ key, count, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
  }

  function cellColor(count) {
    if (count === 0) return "var(--teal-ll, #e6f4f3)";
    if (count === 1) return "#a3d9d6";
    if (count <= 3) return "#5bbdb8";
    return "#1a8a85";
  }

  return (
    <div>
      <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
        Activity — last 35 days
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {cells.map((c) => (
          <div
            key={c.key}
            title={`${c.label}: ${c.count} session${c.count !== 1 ? "s" : ""}`}
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: cellColor(c.count),
              cursor: "default",
              transition: "transform .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.4)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: ".68rem", color: "var(--ink3)", fontWeight: 600 }}>Less</span>
        {["var(--teal-ll,#e6f4f3)", "#a3d9d6", "#5bbdb8", "#1a8a85"].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
        ))}
        <span style={{ fontSize: ".68rem", color: "var(--ink3)", fontWeight: 600 }}>More</span>
      </div>
    </div>
  );
}

// ── Accuracy trend (sparkline) ────────────────────────────────────────────────
function Sparkline({ sessions }) {
  const pts = [...sessions].reverse().slice(-20);
  if (pts.length < 2) return null;

  const W = 280, H = 60;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map((s) => H - (s.pct / 100) * H);

  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
        Accuracy trend
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 60, display: "block" }}>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a8a85" stopOpacity=".35" />
            <stop offset="100%" stopColor="#1a8a85" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sg)" />
        <path d={pathD} fill="none" stroke="#1a8a85" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((s, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill="#1a8a85" />
        ))}
      </svg>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StatsTab({ history = [], saved = [], streak = 0 }) {
  const totalSessions = history.length;
  const totalCards = saved.length;
  const avgPct = totalSessions
    ? Math.round(history.reduce((sum, s) => sum + s.pct, 0) / totalSessions)
    : null;
  const bestPct = totalSessions ? Math.max(...history.map((s) => s.pct)) : null;
  const totalStudied = history.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalCorrect = history.reduce((sum, s) => sum + (s.correct || 0), 0);
  const overallAcc = totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : null;

  if (totalSessions === 0) {
    return (
      <TabEmpty
        icon="📊"
        title="No stats yet"
        message="Complete a study session to start tracking your progress. Your accuracy, streaks, and history will all appear here."
      />
    );
  }

  return (
    <div className="tab-pane" style={{ maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Headline */}
      <div style={{ marginBottom: "1.5rem", animation: "fadeUp .3s ease" }}>
        <h2 style={{ fontWeight: 900, fontSize: "1.4rem", color: "var(--ink)", margin: 0 }}>
          Your Progress 📈
        </h2>
        <p style={{ fontSize: ".85rem", color: "var(--ink3)", fontWeight: 600, marginTop: 4 }}>
          {totalSessions} study session{totalSessions !== 1 ? "s" : ""} · {totalStudied} cards reviewed
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
          animation: "fadeUp .35s ease",
        }}
      >
        <StatCard icon="🔥" label="Current streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} accent="var(--surface-streak)" />
        <StatCard icon="🏆" label="Best score" value={bestPct !== null ? `${bestPct}%` : "—"} accent="#fef9e7" />
        <StatCard icon="🎯" label="Avg accuracy" value={avgPct !== null ? `${avgPct}%` : "—"} sub="across all sessions" accent="#f0f9ff" />
        <StatCard icon="🃏" label="Saved cards" value={totalCards} sub="in your library" accent="#f0fdf4" />
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
          animation: "fadeUp .4s ease",
        }}
      >
        {/* Overall accuracy breakdown */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1.5px solid var(--teal-ll, #d4ecea)",
            borderRadius: 18,
            padding: "1.25rem 1.5rem",
            boxShadow: "0 2px 12px rgba(10,92,89,.06)",
          }}
        >
          <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
            Overall accuracy
          </div>
          {overallAcc !== null && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: overallAcc >= 70 ? "#0a7c5c" : "#b91c1c", lineHeight: 1 }}>
                {overallAcc}%
              </div>
              <div style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--ink3)", marginTop: 4 }}>
                {totalCorrect} correct out of {totalStudied} reviewed
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--ink2)", marginBottom: 4 }}>Correct</div>
              <MiniBar pct={overallAcc ?? 0} color="#1a8a85" />
            </div>
            <div>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--ink2)", marginBottom: 4 }}>Wrong</div>
              <MiniBar pct={overallAcc !== null ? 100 - overallAcc : 0} color="#e05252" />
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1.5px solid var(--teal-ll, #d4ecea)",
            borderRadius: 18,
            padding: "1.25rem 1.5rem",
            boxShadow: "0 2px 12px rgba(10,92,89,.06)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Sparkline sessions={history} />
          <ActivityGrid sessions={history} />
        </div>
      </div>

      {/* Score distribution */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1.5px solid var(--teal-ll, #d4ecea)",
          borderRadius: 18,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 12px rgba(10,92,89,.06)",
          animation: "fadeUp .45s ease",
        }}
      >
        <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
          Score distribution
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70 }}>
          {[
            { label: "0–39%", range: [0, 39], color: "#e05252" },
            { label: "40–59%", range: [40, 59], color: "#f4845f" },
            { label: "60–79%", range: [60, 79], color: "#f4c430" },
            { label: "80–99%", range: [80, 99], color: "#5bbdb8" },
            { label: "100%", range: [100, 100], color: "#1a8a85" },
          ].map(({ label, range, color }) => {
            const count = history.filter((s) => s.pct >= range[0] && s.pct <= range[1]).length;
            const maxCount = Math.max(...[
              history.filter((s) => s.pct < 40).length,
              history.filter((s) => s.pct >= 40 && s.pct < 60).length,
              history.filter((s) => s.pct >= 60 && s.pct < 80).length,
              history.filter((s) => s.pct >= 80 && s.pct < 100).length,
              history.filter((s) => s.pct === 100).length,
            ], 1);
            const h = Math.max((count / maxCount) * 60, count > 0 ? 8 : 3);
            return (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: ".7rem", fontWeight: 800, color: "var(--ink2)" }}>{count > 0 ? count : ""}</span>
                <div
                  title={`${label}: ${count} session${count !== 1 ? "s" : ""}`}
                  style={{
                    width: "100%",
                    height: h,
                    background: color,
                    borderRadius: "6px 6px 0 0",
                    opacity: count === 0 ? 0.25 : 1,
                    transition: "height .5s cubic-bezier(.4,0,.2,1)",
                  }}
                />
                <span style={{ fontSize: ".65rem", fontWeight: 700, color: "var(--ink3)", textAlign: "center" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session history */}
      <div style={{ animation: "fadeUp .5s ease" }}>
        <div style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
          Recent sessions
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.slice(0, 15).map((s, i) => (
            <SessionRow key={s.id} session={s} index={i} />
          ))}
          {history.length > 15 && (
            <p style={{ textAlign: "center", fontSize: ".78rem", fontWeight: 600, color: "var(--ink3)", padding: ".5rem" }}>
              + {history.length - 15} older sessions
            </p>
          )}
        </div>
      </div>
    </div>
  );
}