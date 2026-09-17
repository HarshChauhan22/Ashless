"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "craving" | "redirect" | "reward" | "outline" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  // design-system.md §5 — uppercase is reserved for exactly "I WANT TO SMOKE"
  // and "SAVE ₹[amount]"; every other button stays sentence case, set by callers.
  craving: "bg-craving-500 text-white active:scale-[0.97]",
  redirect: "bg-redirect-600 text-white active:scale-[0.97]",
  reward: "bg-reward-600 text-white active:scale-[0.97]",
  outline: "bg-transparent border border-line-200 text-ink-900 active:scale-[0.97]",
  ghost: "bg-transparent text-redirect-600 active:scale-[0.97]",
};

export function Button({
  variant = "redirect",
  className = "",
  children,
  ...rest
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`h-14 w-full rounded-pill px-6 text-base font-semibold transition-transform disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", tint }: { children: ReactNode; className?: string; tint?: "craving" | "redirect" | "reward" }) {
  const tintClass =
    tint === "craving" ? "bg-craving-100" : tint === "redirect" ? "bg-redirect-100" : tint === "reward" ? "bg-reward-100" : "bg-surface-0";
  return <div className={`rounded-md border border-line-200 p-5 ${tintClass} ${className}`}>{children}</div>;
}

// "-deep" variants are the near-black, hand-tuned full-bleed backgrounds the
// artifact uses for the immersive craving/payment-outcome screens (not the
// flat surface-50 the rest of the app sits on) — see DECISIONS.md D-011.
const DEEP_BG: Record<string, string> = {
  "craving-deep": "#1A120D",
  "reward-deep": "#0E1712",
  "redirect-deep": "#0C1613",
};

export function ScreenShell({
  children,
  bg = "surface",
}: {
  children: ReactNode;
  bg?: "surface" | "craving" | "redirect" | "reward" | "craving-deep" | "reward-deep" | "redirect-deep" | "alert-surface";
}) {
  if (bg in DEEP_BG) {
    return (
      <div className="flex min-h-screen flex-col px-5 py-6" style={{ background: DEEP_BG[bg] }}>
        {children}
      </div>
    );
  }
  const bgClass =
    bg === "craving"
      ? "bg-craving-100"
      : bg === "redirect"
        ? "bg-redirect-100"
        : bg === "reward"
          ? "bg-reward-100"
          : bg === "alert-surface"
            ? "bg-surface-100"
            : "bg-surface-50";
  return <div className={`flex min-h-screen flex-col ${bgClass} px-5 py-6`}>{children}</div>;
}

export function BackLink({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="mb-4 self-start text-sm font-medium text-ink-600">
      ← {label}
    </button>
  );
}
