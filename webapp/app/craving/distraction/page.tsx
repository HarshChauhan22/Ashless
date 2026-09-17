"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenShell } from "@/components/ui";
import { JOKES } from "@/lib/jokes";
import { track } from "@/lib/api-client";

export default function DistractionPage() {
  return (
    <Suspense>
      <DistractionContent />
    </Suspense>
  );
}

// Matches QuickDistraction.dc.html exactly (DECISIONS.md D-011): a single
// scrollable list of joke cards, tap to expand the punchline in place —
// not a grid of numbered tiles leading to a separate full-screen reveal.
function DistractionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const cravingSessionId = params.get("cravingSessionId") ?? "";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    track("distraction_opened", { cravingSessionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(index: number) {
    const next = openIndex === index ? null : index;
    setOpenIndex(next);
    if (next !== null) track("joke_viewed", { cravingSessionId, jokeIndex: index });
  }

  async function returnToOptions() {
    track("distraction_completed", { cravingSessionId });
    router.replace(`/craving?cravingSessionId=${cravingSessionId}`);
  }

  return (
    <ScreenShell>
      <h1 className="text-[22px] font-bold text-ink-900">Give your mind a break.</h1>
      <p className="mt-1.5 text-sm text-ink-600">Tap a joke to read it.</p>

      <div className="mt-6 flex flex-1 flex-col gap-3 overflow-y-auto">
        {JOKES.map((joke, i) => {
          const open = openIndex === i;
          return (
            <button key={i} onClick={() => toggle(i)} className="rounded-md bg-surface-0 p-4 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold text-ink-900">{joke.setup}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={open ? "#F0834F" : "#5F6368"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className={`shrink-0 transition-transform ${open ? "" : "rotate-180"}`}
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </div>
              {open && <p className="mt-2 text-sm leading-relaxed text-ink-600">{joke.punchline}</p>}
            </button>
          );
        })}
      </div>

      <button onClick={returnToOptions} className="pb-2 pt-4 text-center text-[13px] text-ink-600 underline">
        Feeling better? Go back
      </button>
    </ScreenShell>
  );
}
