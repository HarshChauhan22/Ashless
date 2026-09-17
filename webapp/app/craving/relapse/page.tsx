"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenShell, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

const TRIGGERS = ["Stress", "Social", "Habit", "Alcohol", "Other"];

interface WalletData {
  balancePaise: number;
}

export default function RelapsePage() {
  return (
    <Suspense>
      <RelapseContent />
    </Suspense>
  );
}

// Matches RelapseFlow.dc.html exactly (DECISIONS.md D-011): optional trigger
// chips, a reassurance card that only the streak resets — the balance never
// does — and a link out to the AI Coach, which is how Coach becomes
// reachable now that it's not a bottom-nav tab.
function RelapseContent() {
  const router = useRouter();
  const params = useSearchParams();
  const cravingSessionId = params.get("cravingSessionId") ?? "";
  const [trigger, setTrigger] = useState<string | null>(null);
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    apiFetch<WalletData>("/api/wallet").then((res) => {
      if (res.ok) setBalancePaise(res.data.balancePaise);
    });
  }, []);

  async function logIt() {
    setLogging(true);
    if (cravingSessionId) {
      await apiFetch(`/api/craving-sessions/${cravingSessionId}`, { method: "PATCH", body: { outcome: "smoked", trigger: trigger ?? undefined } });
    } else {
      await apiFetch("/api/relapse", { method: "POST", body: { quantity: 1, trigger } });
    }
    router.replace("/home");
  }

  return (
    <ScreenShell>
      <h1 className="mt-2 text-[23px] font-bold leading-snug text-ink-900">You smoked. That&apos;s okay — let&apos;s log it and keep going.</h1>

      <p className="mt-8 text-[13px] font-semibold text-ink-600">WHAT TRIGGERED IT? (OPTIONAL)</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TRIGGERS.map((t) => (
          <button
            key={t}
            onClick={() => setTrigger(trigger === t ? null : t)}
            className={`rounded-pill border px-3.5 py-2 text-[13px] font-semibold ${
              trigger === t ? "border-redirect-600 bg-redirect-100 text-redirect-600" : "border-line-200 bg-surface-0 text-ink-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="rounded-md bg-reward-100 p-[18px]">
        <div className="flex items-start gap-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FAE7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" />
          </svg>
          <p className="text-sm leading-relaxed text-ink-900">
            Your streak will reset to 0. Your <span className="font-bold tabular-nums">total tracked savings of ₹{balancePaise ?? "…"}</span> stay
            exactly where they are.
          </p>
        </div>
      </div>

      <Button variant="redirect" className="mt-4" onClick={logIt} disabled={logging}>
        {logging ? "Logging…" : "Log it"}
      </Button>
      <button onClick={() => router.push("/coach")} className="mt-3.5 text-center text-[13px] font-semibold text-redirect-600">
        Talk to AI Coach about this
      </button>
    </ScreenShell>
  );
}
