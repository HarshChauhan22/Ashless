import { useEffect, useRef, useState } from "react";

// Shared by Breathing and the post-payment "sit with it" screen — same
// mechanic in both places (start at N seconds, optionally extend while
// running, fire onComplete exactly once at zero). Mirrors
// webapp/components/CountdownTimer.tsx's useCountdown hook.
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
