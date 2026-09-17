"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenShell } from "@/components/ui";
import { track } from "@/lib/api-client";

// Craving Intervention Hub — matches CravingIntervention.dc.html exactly
// (DECISIONS.md D-011): no back affordance, three genuinely equal-weight
// options (Digital Smoking Room visually primary per the artifact), and
// "I already smoked" as the only other exit, leading to a dedicated Relapse
// Flow screen rather than logging inline.
export default function CravingHubPage() {
  return (
    <Suspense>
      <CravingHubContent />
    </Suspense>
  );
}

function CravingHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const cravingSessionId = params.get("cravingSessionId") ?? "";

  useEffect(() => {
    track("craving_intervention_opened", { cravingSessionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(path: string, optionName: string) {
    track("intervention_path_selected", { cravingSessionId, path: optionName });
    router.push(`${path}?cravingSessionId=${cravingSessionId}`);
  }

  return (
    <ScreenShell bg="craving-deep">
      <div className="flex flex-1 flex-col">
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-ink-900">
          You&apos;re craving a cigarette. Let&apos;s ride it out for a second.
        </h1>
        <p className="mt-2.5 text-[15px] leading-snug text-ink-600">Cravings usually peak and pass within a few minutes.</p>

        <div className="mt-8 flex flex-col gap-3.5">
          <button onClick={() => go("/craving/breathing", "breathing")} className="flex items-center gap-3.5 rounded-md bg-surface-0 p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-craving-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F0834F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 6 6 0 0 0 0-12 3 3 0 0 1 0-6" />
              </svg>
            </span>
            <div>
              <p className="text-base font-semibold text-ink-900">60-second breathing</p>
              <p className="mt-0.5 text-[13px] text-ink-600">A guided pacer to slow things down</p>
            </div>
          </button>

          <button onClick={() => go("/craving/distraction", "quick_distraction")} className="flex items-center gap-3.5 rounded-md bg-surface-0 p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-craving-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F0834F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </span>
            <div>
              <p className="text-base font-semibold text-ink-900">Quick distraction</p>
              <p className="mt-0.5 text-[13px] text-ink-600">A short prompt to shift your focus</p>
            </div>
          </button>

          <button onClick={() => go("/craving/smoking-room", "smoking_room")} className="flex items-center gap-3.5 rounded-md bg-redirect-600 p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.16]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="12" width="12" height="7" rx="2" />
                <path d="M15 15h4" />
                <path d="M18 8c6 1 8 5 8 8s-2 3-2 6" strokeDasharray="2 3" />
              </svg>
            </span>
            <div>
              <p className="text-base font-semibold text-white">Go to Digital Smoking Room</p>
              <p className="mt-0.5 text-[13px] text-white/80">Still craving? See what it would really cost.</p>
            </div>
          </button>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => router.push(`/craving/relapse?cravingSessionId=${cravingSessionId}`)}
          className="pb-2 text-center text-[13px] text-ink-600 underline"
        >
          I already smoked
        </button>
      </div>
    </ScreenShell>
  );
}
