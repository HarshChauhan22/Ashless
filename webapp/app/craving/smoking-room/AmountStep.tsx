"use client";

import { Button } from "@/components/ui";
import type { SmokingProfileClient } from "./types";

// AmountConfirmation — "the pivot" per canvas.json's own annotation. Matches
// AmountConfirmation.dc.html exactly (DECISIONS.md D-011): a cost card
// overlapping a redirect card via a connector arrow, not two separate Cards.
export function AmountStep({
  profile,
  quantity,
  onBack,
  onSave,
  saving,
}: {
  profile: SmokingProfileClient;
  quantity: number;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const amount = quantity * profile.costPerStickPaise;

  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="rounded-[16px] bg-craving-100 px-[22px] pb-[26px] pt-[22px]">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-xl font-semibold tabular-nums text-ink-600">
            {quantity} × ₹{profile.costPerStickPaise} =
          </span>
          <span className="text-[34px] font-bold tabular-nums text-craving-500">₹{amount}</span>
        </div>
        <p className="mt-2.5 text-center text-sm text-ink-600">That&apos;s what this craving would have cost you.</p>
      </div>

      <div className="relative z-10 -my-3.5 flex justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-redirect-100 bg-surface-0 shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#63C7B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M18 13l-6 6-6-6" />
          </svg>
        </div>
      </div>

      <div className="rounded-[16px] bg-redirect-100 px-[22px] pb-[22px] pt-7">
        <p className="text-center text-[22px] font-bold text-redirect-600">Redirect it instead?</p>
        <div className="mt-3.5 flex items-center justify-center gap-2.5 rounded-md bg-surface-0 p-3.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#63C7B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h9l3 3v15H6z" />
            <path d="M9 8h6M9 12h6M9 16h3" />
          </svg>
          <span className="text-lg font-bold tabular-nums text-ink-900">₹{amount} → Quit Wallet</span>
        </div>
        <p className="mt-3 text-center text-[13px] text-ink-600">Tracked as your savings — never to a cigarette seller.</p>
      </div>

      <div className="mt-6">
        <Button variant="redirect" onClick={onSave} disabled={saving} className="tabular-nums">
          {saving ? "Starting…" : `Redirect ₹${amount} to Quit Wallet`}
        </Button>
        <button className="mt-3.5 w-full text-center text-sm font-semibold text-redirect-600" onClick={onBack}>
          Adjust quantity
        </button>
      </div>
    </div>
  );
}
