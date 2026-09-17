"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenShell, Button } from "@/components/ui";
import { CountdownRing, useCountdown } from "@/components/CountdownTimer";
import { apiFetch, track } from "@/lib/api-client";

type Phase = "running" | "complete";

export default function BreathingPage() {
  return (
    <Suspense>
      <BreathingContent />
    </Suspense>
  );
}

function BreathingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const cravingSessionId = params.get("cravingSessionId") ?? "";
  const [phase, setPhase] = useState<Phase>("running");

  useEffect(() => {
    track("breathing_started", { cravingSessionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStop() {
    track("breathing_stopped", { cravingSessionId });
    router.replace(`/craving?cravingSessionId=${cravingSessionId}`);
  }

  function handleComplete() {
    track("breathing_completed", { cravingSessionId });
    setPhase("complete");
  }

  const { secondsLeft, target, extend } = useCountdown(60, handleComplete);

  function handleExtend() {
    extend(15);
    track("breathing_extended", { cravingSessionId, newTotalSeconds: target + 15 });
  }

  async function feelBetter() {
    if (cravingSessionId) {
      await apiFetch(`/api/craving-sessions/${cravingSessionId}`, {
        method: "PATCH",
        body: { outcome: "resisted", copingAction: "breathing_exercise" },
      });
    }
    router.replace("/home");
  }

  return (
    <ScreenShell bg="craving-deep">
      {phase === "running" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-9 text-center">
          <div>
            <h1 className="text-xl font-semibold leading-snug text-ink-900">Breathe in. Breathe out.</h1>
            <p className="mt-2 text-sm text-ink-600">Just ride it out for a minute.</p>
          </div>
          <CountdownRing secondsLeft={secondsLeft} target={target} accent="craving" />
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={handleExtend} className="flex-1">
              +15 sec
            </Button>
            <button onClick={handleStop} className="h-14 flex-1 rounded-pill bg-ink-900 text-[15px] font-semibold text-surface-50">
              Stop
            </button>
          </div>
        </div>
      )}

      {phase === "complete" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <span className="text-5xl">🌿</span>
          <h1 className="text-2xl font-semibold text-ink-900">Nice. You gave the craving some time.</h1>
          <p className="text-sm text-ink-600">
            That doesn&apos;t mean it&apos;s gone for good — but you got through this moment without acting on it.
          </p>
          <div className="mt-4 flex w-full flex-col gap-3">
            <Button variant="reward" onClick={feelBetter}>
              I feel better
            </Button>
            <Button variant="outline" onClick={() => router.replace(`/craving?cravingSessionId=${cravingSessionId}`)}>
              Back to Craving Options
            </Button>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
