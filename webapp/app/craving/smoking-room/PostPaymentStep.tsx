"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { CountdownRing, useCountdown } from "@/components/CountdownTimer";
import { track } from "@/lib/api-client";

type Phase = "timer" | "satisfaction" | "reinforcement";

// The post-payment "sit with it" screen (9a · Craving Redirect Timer) —
// matches PostPaymentTimer.dc.html (DECISIONS.md D-011): no extend button,
// just "I feel better now" / "Stop", both leading to the same reinforcement
// summary. Runs AFTER PaymentSuccessScreen's "Done", not before it.
export function PostPaymentStep({
  amount,
  newBalance,
  streakDays,
  cigarettesAvoided,
  cravingSessionId,
  onDone,
}: {
  amount: number;
  newBalance: number;
  streakDays: number;
  cigarettesAvoided: number;
  cravingSessionId: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("timer");

  useEffect(() => {
    track("post_payment_timer_started", { cravingSessionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toSatisfaction(source: "completed" | "stopped") {
    track(`post_payment_timer_${source}`, { cravingSessionId });
    setPhase("satisfaction");
  }

  const { secondsLeft, target } = useCountdown(45, () => toSatisfaction("completed"));

  return (
    <div className="flex flex-1 flex-col">
      {phase === "timer" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-9 text-center">
          <div>
            <h1 className="text-[22px] font-semibold leading-snug text-ink-900">Sit with it for a minute.</h1>
            <p className="mt-2 text-sm text-ink-600">The craving already got its win. Let&apos;s just wait it out.</p>
          </div>
          <CountdownRing secondsLeft={secondsLeft} target={target} accent="reward" />
          <div className="flex w-full flex-col gap-3">
            <Button variant="reward" onClick={() => toSatisfaction("stopped")}>
              I feel better now
            </Button>
            <Button variant="outline" onClick={() => toSatisfaction("stopped")} className="h-12">
              Stop
            </Button>
          </div>
        </div>
      )}

      {phase === "satisfaction" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <span className="text-5xl">💪</span>
          <p className="text-xl font-semibold text-ink-900">You got through it.</p>
          <Button variant="reward" onClick={() => setPhase("reinforcement")}>
            I did it
          </Button>
        </div>
      )}

      {phase === "reinforcement" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <span className="text-5xl">🎉</span>
          <p className="text-2xl font-bold text-ink-900">Craving handled.</p>
          <p className="tabular-nums text-lg text-reward-600">₹{amount} saved.</p>
          <p className="text-ink-600">Another cigarette avoided.</p>
          <p className="text-ink-600">
            Your streak continues — <span className="font-semibold text-ink-900">{streakDays} days</span> smoke-free.
          </p>
          <p className="text-ink-600">
            Your Quit Wallet is now <span className="font-semibold text-reward-600">₹{newBalance}</span>.
          </p>
          <p className="mt-1 text-xs text-ink-300">
            {cigarettesAvoided} {cigarettesAvoided === 1 ? "cigarette" : "cigarettes"} avoided in total.
          </p>
          <Button variant="redirect" className="mt-6" onClick={onDone}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
