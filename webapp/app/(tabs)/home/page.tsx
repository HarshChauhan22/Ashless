"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/store/session";

interface StreakData {
  streakDays: number;
  cigarettesAvoided: number;
}
interface WalletData {
  balancePaise: number;
}
interface Goal {
  id: string;
  title: string;
  targetAmountPaise: number;
  progressPaise: number;
  percent: number;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topGoal, setTopGoal] = useState<Goal | null>(null);

  async function refresh() {
    const [s, w, g] = await Promise.all([
      apiFetch<StreakData>("/api/streak"),
      apiFetch<WalletData>("/api/wallet"),
      apiFetch<Goal[]>("/api/goals"),
    ]);
    if (s.ok) setStreak(s.data);
    if (w.ok) setWallet(w.data);
    if (g.ok && g.data.length > 0) setTopGoal(g.data[0]);
  }

  useEffect(() => {
    if (!userId) {
      router.replace("/login");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function startCraving() {
    const res = await apiFetch<{ id: string }>("/api/craving-sessions", { method: "POST", body: { entryPoint: "home_primary_cta" } });
    if (!res.ok) return;
    router.push(`/craving?cravingSessionId=${res.data.id}`);
  }

  if (!streak || !wallet) {
    return (
      <ScreenShell>
        <p className="text-ink-600">Loading…</p>
      </ScreenShell>
    );
  }

  const ringPct = Math.max(4, Math.min(100, Math.round((streak.streakDays / 30) * 100)));
  const goalPct = topGoal ? Math.min(100, Math.round((topGoal.progressPaise / topGoal.targetAmountPaise) * 100)) : 0;

  return (
    <ScreenShell>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-ink-600">{greeting()}</p>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-line-200 bg-surface-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center py-5">
          <div
            className="flex h-[180px] w-[180px] items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#3FAE7A 0% ${ringPct}%, #1C1C1E ${ringPct}% 100%)` }}
          >
            <div className="flex h-[150px] w-[150px] flex-col items-center justify-center rounded-full bg-surface-0">
              <span className="text-4xl font-bold tabular-nums leading-none text-reward-600">{streak.streakDays}</span>
              <span className="mt-1 text-xs text-ink-600">
                {streak.streakDays === 1 ? "day smoke-free" : "days smoke-free"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-reward-100 p-4">
          <div>
            <p className="text-xs text-ink-600">Total saved so far</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-reward-600">₹{wallet.balancePaise}</p>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3FAE7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
            <circle cx="18" cy="12" r="2" />
          </svg>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            onClick={startCraving}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-pill bg-craving-500 text-base font-semibold text-white active:scale-[0.97]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            I&apos;m craving
          </button>
          <p className="text-[13px] text-ink-600">It&apos;s okay. Let&apos;s deal with it together.</p>
        </div>

        {topGoal && (
          <button onClick={() => router.push("/wallet/goals")} className="mt-4 rounded-md border border-line-200 bg-surface-0 p-3.5 text-left">
            <div className="mb-2 flex items-center justify-between text-[13px] text-ink-600">
              <span>{topGoal.title} goal</span>
              <span className="tabular-nums">
                ₹{topGoal.progressPaise} / ₹{topGoal.targetAmountPaise}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-surface-100">
              <div className="h-full rounded-pill bg-redirect-600" style={{ width: `${goalPct}%` }} />
            </div>
          </button>
        )}
      </div>
    </ScreenShell>
  );
}
