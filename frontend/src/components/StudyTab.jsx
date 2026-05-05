import { useEffect, useRef, useState } from "react";
import Doodle from "./Doodle";
import { addSession } from "../utils/storage";

export default function StudyTab({ cards, customLabel, userId }) {
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [swipe, setSwipe] = useState(null);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const dragX = useRef(null);
  const savedRef = useRef(false);

  function initDeck() {
    const d = [...cards]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(cards.length, 12));
    setDeck(d);
    setIdx(0);
    setFlipped(false);
    setSwipe(null);
    setRight(0);
    setWrong(0);
    setDone(false);
    setStarted(true);
    savedRef.current = false;
  }

  function flip() {
    if (!swipe) setFlipped((f) => !f);
  }

  function doSwipe(dir) {
    if (!flipped || swipe) return;
    setSwipe(dir);
    const newRight = dir === "right" ? right + 1 : right;
    const newWrong = dir === "left" ? wrong + 1 : wrong;
    if (dir === "right") setRight((r) => r + 1);
    else setWrong((w) => w + 1);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= deck.length) {
        if (userId && !savedRef.current) {
          const total = deck.length;
          const pct = Math.round((newRight / total) * 100);
          addSession(userId, {
            correct: newRight,
            wrong: newWrong,
            total,
            pct,
          });
          savedRef.current = true;
        }
        setDone(true);
      } else {
        setIdx(next);
        setFlipped(false);
        setSwipe(null);
      }
    }, 440);
  }

  useEffect(() => {
    const h = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      }
      if (e.key === "ArrowRight") doSwipe("right");
      if (e.key === "ArrowLeft") doSwipe("left");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!cards.length)
    return (
      <div className="tab-pane center-pane">
        <div className="empty">
          <div className="empty-ico">🃏</div>
          <p>Generate or save some cards first, then study here!</p>
        </div>
      </div>
    );

  if (!started)
    return (
      <div className="tab-pane center-pane">
        <div className="sstart">
          <div className="sdeck">
            <div className="sdc sdc2" />
            <div className="sdc sdc1" />
            <div className="sdc sdc0" />
          </div>
          <h2 className="stitle">Ready to study?</h2>
          <p className="ssub">
            {customLabel ?? `${Math.min(cards.length, 12)} cards`} · tap to flip
            · swipe to score
          </p>
          <button className="btn btn-teal lg" onClick={initDeck}>
            Start session
          </button>
          <p className="shint">
            ← Didn't know &nbsp;·&nbsp; Space to flip &nbsp;·&nbsp; → Got it!
          </p>
        </div>
      </div>
    );

  if (done) {
    const pct = Math.round((right / deck.length) * 100);
    return (
      <div className="tab-pane center-pane">
        <div className="rcard">
          <div
            className="rpct"
            style={{ color: pct >= 70 ? "#0a7c5c" : "#b91c1c" }}
          >
            {pct}%
          </div>
          <p className="rmsg">
            {pct === 100
              ? "Perfect score! 🎉"
              : pct >= 80
                ? "Excellent work! 🌟"
                : pct >= 60
                  ? "Good job! Keep going 💪"
                  : "Keep practicing! 📚"}
          </p>
          <div className="rbreak">
            <div className="rbi r">
              <span className="rval">{right}</span>
              <span className="rlbl">Correct</span>
            </div>
            <div className="rbi w">
              <span className="rval">{wrong}</span>
              <span className="rlbl">Wrong</span>
            </div>
            <div className="rbi t">
              <span className="rval">{deck.length}</span>
              <span className="rlbl">Total</span>
            </div>
          </div>
          <button className="btn btn-teal" onClick={initDeck}>
            Study again
          </button>
        </div>
      </div>
    );
  }

  const card = deck[idx];
  const pct = Math.round((idx / deck.length) * 100);

  return (
    <div className="tab-pane">
      <div className="smeta">
        <span className="sctr">
          Card {idx + 1} / {deck.length}
        </span>
        <div className="scores">
          <span className="spill r">✓ {right}</span>
          <span className="spill w">✗ {wrong}</span>
        </div>
      </div>
      <div className="prog">
        <div className="progf" style={{ width: `${pct}%` }} />
      </div>

      <div
        className={`stage${swipe === "right" ? " sr" : swipe === "left" ? " sl" : ""}`}
        onClick={flipped ? undefined : flip}
        onTouchStart={(e) => {
          dragX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (dragX.current === null) return;
          const d = e.changedTouches[0].clientX - dragX.current;
          dragX.current = null;
          if (Math.abs(d) < 40) {
            flip();
            return;
          }
          doSwipe(d > 0 ? "right" : "left");
        }}
      >
        <div className={`fcard${flipped ? " flipped" : ""}`}>
          <div className="face front teal-card">
            <Doodle />
            <div className="inner-box">
              <span className="clbl">Question</span>
              <p className="ctxt">{card.question}</p>
            </div>
            {!flipped && <p className="taphint">Tap to flip</p>}
          </div>
          <div className="face back teal-card">
            <Doodle />
            <div className="inner-box">
              <span className="clbl">Answer</span>
              <p className="ctxt">{card.answer}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sacts">
        <button
          className="sbtn w"
          onClick={() => doSwipe("left")}
          disabled={!flipped}
        >
          ✗ Didn't know
        </button>
        <button className="fmid" onClick={flip}>
          {flipped ? "↺ Flip back" : "↷ Flip"}
        </button>
        <button
          className="sbtn r"
          onClick={() => doSwipe("right")}
          disabled={!flipped}
        >
          Got it! ✓
        </button>
      </div>
      <p className="kbhint">
        ← Didn't know &nbsp;·&nbsp; Space to flip &nbsp;·&nbsp; → Got it!
      </p>
    </div>
  );
}
