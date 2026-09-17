"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import type { WalletActivityItem } from "@/lib/db";

interface WalletData {
  balancePaise: number;
  activity: WalletActivityItem[];
  thisMonthPaise: number;
  redirectedThisMonth: number;
}
interface Goal {
  id: string;
  title: string;
  targetAmountPaise: number;
  progressPaise: number;
  percent: number;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short" })}, ${time}`;
}

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topGoal, setTopGoal] = useState<Goal | null>(null);
  const [howThisWorksOpen, setHowThisWorksOpen] = useState(false);

  useEffect(() => {
    apiFetch<WalletData>("/api/wallet").then((res) => {
      if (res.ok) setWallet(res.data);
    });
    apiFetch<Goal[]>("/api/goals").then((res) => {
      if (res.ok && res.data.length > 0) setTopGoal(res.data[0]);
    });
  }, []);

  if (!wallet) {
    return (
      <ScreenShell>
        <p className="text-ink-600">Loading…</p>
      </ScreenShell>
    );
  }

  const goalPct = topGoal ? Math.min(100, Math.round((topGoal.progressPaise / topGoal.targetAmountPaise) * 100)) : 0;

  return (
    <ScreenShell>
      <h1 className="text-xl font-bold text-ink-900">Quit Wallet</h1>

      <div className="flex flex-col items-center pb-1 pt-5 text-center">
        <p className="text-[13px] text-ink-600">Total tracked savings</p>
        <p className="mt-1 text-[44px] font-bold tabular-nums text-reward-600">₹{wallet.balancePaise}</p>
        <button onClick={() => setHowThisWorksOpen((v) => !v)} className="mt-1 text-xs font-semibold text-redirect-600 underline">
          How this works
        </button>
        {howThisWorksOpen && (
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-ink-600">
            Every time you redirect a craving in the Digital Smoking Room, the exact amount that cigarette would have cost moves straight into
            this ledger — real money, tracked here, never sent to a cigarette seller.
          </p>
        )}
      </div>

      <div className="mt-3.5 flex gap-3">
        <div className="flex-1 rounded-md border border-line-200 bg-surface-0 p-3.5">
          <p className="text-xs text-ink-600">This month</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink-900">₹{wallet.thisMonthPaise}</p>
        </div>
        <div className="flex-1 rounded-md border border-line-200 bg-surface-0 p-3.5">
          <p className="text-xs text-ink-600">Cravings redirected</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink-900">{wallet.redirectedThisMonth}</p>
        </div>
      </div>

      <button className="mt-3 h-11 w-full rounded-pill border-[1.5px] border-redirect-600 text-sm font-semibold text-redirect-600">
        Redeem — voucher or donation
      </button>

      {topGoal && (
        <button onClick={() => router.push("/wallet/goals")} className="mt-4 rounded-md border border-line-200 bg-surface-0 p-4 text-left">
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <span className="font-semibold text-ink-900">{topGoal.title}</span>
            <span className="tabular-nums text-ink-600">
              ₹{topGoal.progressPaise} / ₹{topGoal.targetAmountPaise}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-pill bg-surface-100">
            <div className="h-full rounded-pill bg-redirect-600" style={{ width: `${goalPct}%` }} />
          </div>
        </button>
      )}
      {!topGoal && (
        <button onClick={() => router.push("/wallet/goals")} className="mt-4 rounded-md border border-dashed border-line-200 p-4 text-center text-sm font-semibold text-redirect-600">
          + Add a savings goal
        </button>
      )}

      <p className="mt-6 text-[13px] font-semibold text-ink-600">RECENT ACTIVITY</p>
      <div className="mt-2 flex-1 overflow-y-auto">
        {wallet.activity.length === 0 && <p className="py-4 text-center text-sm text-ink-600">Your first save will show up here.</p>}
        {wallet.activity.map((item) => (
          <div key={item.id} className="flex items-center gap-3 border-b border-line-200 py-3 last:border-none">
            {item.kind === "redirected" ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-reward-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3FAE7A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4l3 2" />
                </svg>
              </span>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">{item.kind === "redirected" ? "Redirected craving" : "Logged a smoke · streak reset"}</p>
              <p className="text-xs text-ink-300">{formatWhen(item.createdAt)}</p>
            </div>
            {item.kind === "redirected" && <span className="tabular-nums text-sm font-bold text-reward-600">+₹{item.amountPaise}</span>}
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}
