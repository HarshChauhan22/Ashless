"use client";

import { useEffect, useRef, useState } from "react";

const ACCENT_HEX: Record<"craving" | "reward", string> = {
  craving: "#F0834F",
  reward: "#3FAE7A",
};

// Matches the artifact's static conic-gradient ring exactly (DECISIONS.md
// D-011) — the colored arc shows time REMAINING, shrinking as it counts
// down, not a pulsing breathing animation.
export function CountdownRing({ secondsLeft, target, accent }: { secondsLeft: number; target: number; accent: "craving" | "reward" }) {
  const remainingPct = Math.max(0, Math.min(100, Math.round((secondsLeft / target) * 100)));
  const hex = ACCENT_HEX[accent];
  return (
    <div
      className="flex h-[220px] w-[220px] items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${hex} 0% ${remainingPct}%, rgba(255,255,255,0.15) ${remainingPct}% 100%)` }}
    >
      <div className="flex h-[184px] w-[184px] flex-col items-center justify-center rounded-full bg-surface-0">
        <span className="text-5xl font-bold tabular-nums leading-none" style={{ color: hex }}>
          {secondsLeft}
        </span>
        <span className="mt-1 text-xs text-ink-600">seconds left</span>
      </div>
    </div>
  );
}

// The Breathing screen and the post-payment "sit with it" screen each render
// their own button rows (different layouts/labels in the artifact) but share
// this countdown mechanic: start at initialSeconds, optionally extend while
// running, fire onComplete exactly once when it reaches zero.
export function useCountdown(initialSeconds: number, onComplete: () => void) {
  const [elapsed, setElapsed] = useState(0);
  const [target, setTarget] = useState(initialSeconds);
  const completedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (elapsed >= target && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, target]);

  const secondsLeft = Math.max(0, target - elapsed);

  function extend(bySeconds: number) {
    setTarget((t) => t + bySeconds);
  }

  return { secondsLeft, target, extend };
}
