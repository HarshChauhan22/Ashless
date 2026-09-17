"use client";

import { Button } from "@/components/ui";

// SmokingRoomEntry interstitial — matches SmokingRoomEntry.dc.html exactly
// (DECISIONS.md D-011). A screen I hadn't built in earlier phases; the
// artifact keeps it separate from brand selection so the "no cigarettes
// here" framing lands before any pricing input.
export function EntryStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 text-center">
      <div className="mb-7 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-redirect-100">
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="#63C7B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="28" width="20" height="10" rx="2" />
          <path d="M26 33h6" />
          <path d="M34 20c10 2 14 8 14 13s-4 5-4 9" strokeDasharray="3 4" />
          <circle cx="48" cy="46" r="9" />
          <path d="M48 42v8M44 46h8" />
        </svg>
      </div>
      <h1 className="text-[26px] font-bold leading-tight text-ink-900">This is your Digital Smoking Room.</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-600">
        No cigarettes here. Just an honest look at what this craving would have cost you — and a chance to keep that money instead.
      </p>
      <div className="mt-8 w-full">
        <Button variant="redirect" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
