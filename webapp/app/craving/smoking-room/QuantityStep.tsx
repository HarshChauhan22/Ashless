"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { SmokingProfileClient } from "./types";

// Matches QuantitySelection.dc.html exactly (DECISIONS.md D-011): centered
// stepper with a live ≈₹ estimate, no preset quantity chips.
export function QuantityStep({ profile, onContinue }: { profile: SmokingProfileClient; onContinue: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 text-center">
      <h1 className="mb-12 text-2xl font-bold text-ink-900">How many would you have had?</h1>

      <div className="flex items-center gap-7">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-line-200 bg-surface-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span className="min-w-16 text-[56px] font-bold tabular-nums text-ink-900">{quantity}</span>
        <button onClick={() => setQuantity((q) => q + 1)} className="flex h-14 w-14 items-center justify-center rounded-full bg-redirect-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <p className="mt-9 text-xl font-semibold tabular-nums text-redirect-600">≈ ₹{quantity * profile.costPerStickPaise}</p>

      <div className="mt-12 w-full">
        <Button variant="redirect" onClick={() => onContinue(quantity)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
