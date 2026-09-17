"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

const UPI_METHODS = [
  { id: "gpay", label: "Google Pay", bg: "rgba(91,141,239,0.16)", stroke: "#5B8DEF" },
  { id: "phonepe", label: "PhonePe", bg: "rgba(99,199,184,0.16)", stroke: "#63C7B8" },
  { id: "paytm", label: "Paytm", bg: "rgba(99,199,184,0.16)", stroke: "#63C7B8" },
] as const;

// PaymentInitiation — matches PaymentInitiation.dc.html (DECISIONS.md D-011):
// a real in-app UPI method picker (Google Pay / PhonePe / Paytm / manual UPI
// ID) replacing the earlier placeholder "Opening your UPI app…" transition.
// This is still MockPaymentProvider underneath — the method choice is
// cosmetic and never leaves the device; no real UPI integration exists.
export function PaymentMethodPicker({ amount, onPay }: { amount: number; onPay: () => void }) {
  const [method, setMethod] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col">
      <div className="pb-2 pt-6 text-center">
        <p className="text-[40px] font-bold tabular-nums text-ink-900">₹{amount}</p>
        <div className="mt-2.5 flex items-center justify-center gap-2 text-sm text-ink-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#63C7B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l3 2" />
          </svg>
          Paying: Ashless
        </div>
        <p className="mt-1 text-xs text-ink-300">A real payment · tracked as your savings — never to a cigarette seller</p>
      </div>

      <div className="mt-7 flex flex-col gap-3">
        <p className="text-[13px] font-semibold tracking-wide text-ink-600">CHOOSE A UPI METHOD</p>

        {UPI_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`flex items-center gap-3.5 rounded-md border p-4 text-left ${method === m.id ? "border-redirect-600" : "border-line-200"} bg-surface-0`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: m.bg }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <span className="flex-1 text-[15px] font-semibold text-ink-900">{m.label}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ))}

        <button
          onClick={() => setMethod("manual")}
          className={`flex items-center gap-3.5 rounded-md border border-dashed p-4 text-left ${method === "manual" ? "border-redirect-600" : "border-line-200"} bg-surface-0`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </span>
          <span className="flex-1 text-[15px] font-semibold text-ink-600">Enter UPI ID manually</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="flex-1" />

      <Button variant="redirect" onClick={onPay} className="tabular-nums">
        Pay ₹{amount}
      </Button>
    </div>
  );
}

// PaymentPending — matches PaymentPending.dc.html.
export function PaymentProcessing() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="relative flex h-[120px] w-[120px] items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120" className="absolute animate-spin" style={{ animationDuration: "1.4s" }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#BFE1E3" strokeWidth="6" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#63C7B8" strokeWidth="6" strokeLinecap="round" strokeDasharray="90 300" />
        </svg>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-0">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#63C7B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M3 10h18" />
            <circle cx="16" cy="15" r="1.5" fill="#63C7B8" stroke="none" />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-lg font-semibold text-ink-900">Confirming your payment…</p>
        <p className="mt-2 text-sm text-ink-600">This can take a few seconds. Don&apos;t close the app.</p>
      </div>
    </div>
  );
}

// PaymentSuccess — matches PaymentSuccess.dc.html. This is screen 9; the
// "sit with it" countdown (PostPaymentStep) is a separate screen 9a that
// follows once "Done" is tapped — the artifact runs celebration THEN the
// calming timer, not the other way round.
export function PaymentSuccessScreen({
  amount,
  totalTrackedSavings,
  redirectedThisMonth,
  onDone,
}: {
  amount: number;
  totalTrackedSavings: number;
  redirectedThisMonth: number;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-reward-600 shadow-[0_8px_24px_rgba(63,174,122,0.35)]">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <p className="mt-7 text-[23px] font-bold leading-snug tabular-nums text-ink-900">₹{amount} just became tracked savings.</p>

      <div className="mt-7 rounded-md bg-surface-0 px-7 py-5">
        <p className="text-[13px] text-ink-600">Total tracked savings</p>
        <p className="mt-1 text-[38px] font-bold tabular-nums text-reward-600">₹{totalTrackedSavings}</p>
      </div>

      <p className="mt-5 text-[15px] text-ink-600">
        That&apos;s {redirectedThisMonth} {redirectedThisMonth === 1 ? "craving" : "cravings"} you&apos;ve redirected this month.
      </p>

      <div className="flex-1" />

      <Button variant="reward" onClick={onDone} className="tabular-nums">
        Done
      </Button>
    </div>
  );
}

// PaymentFailure — matches PaymentFailure.dc.html. Two exits: retry, or mark
// the craving as resisted anyway (the money never moved either way).
export function PaymentFailedScreen({ reason, onRetry, onMarkResisted }: { reason: string; onRetry: () => void; onMarkResisted: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
      <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-line-200 bg-surface-0">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E5534B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </div>
      <p className="mt-6 text-[22px] font-bold text-ink-900">Payment didn&apos;t go through.</p>
      <p className="mt-2 text-sm text-ink-600">{reason}</p>

      <div className="flex-1" />

      <div className="flex w-full flex-col gap-3">
        <Button variant="redirect" onClick={onRetry}>
          Try again
        </Button>
        <Button variant="outline" onClick={onMarkResisted}>
          Mark as resisted anyway
        </Button>
      </div>
    </div>
  );
}
