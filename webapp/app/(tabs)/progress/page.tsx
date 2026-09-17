"use client";

import { useEffect, useState } from "react";
import { ScreenShell, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

interface ProgressData {
  streakDays: number;
  longestStreakDays: number;
  cigarettesAvoided: number;
  totalSavedPaise: number;
  byTrigger: { trigger: string; count: number }[];
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    apiFetch<ProgressData>("/api/progress").then((res) => {
      if (res.ok) setData(res.data);
    });
  }, []);

  if (!data) {
    return (
      <ScreenShell>
        <p className="text-ink-600">Loading…</p>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-ink-900">Track</h1>

        <Card tint="reward" className="flex flex-col items-center gap-1 py-8">
          <span className="tabular-nums text-5xl font-bold text-reward-600">{data.streakDays}</span>
          <span className="text-sm font-medium text-ink-600">days smoke-free</span>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-300">Longest streak</span>
            <span className="tabular-nums text-2xl font-bold text-ink-900">{data.longestStreakDays}d</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-300">Total saved</span>
            <span className="tabular-nums text-2xl font-bold text-reward-600">₹{data.totalSavedPaise}</span>
          </Card>
        </div>

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-300">Cigarettes avoided</span>
            <span className="tabular-nums text-lg font-bold text-ink-900">{data.cigarettesAvoided}</span>
          </div>
          <p className="text-xs text-ink-600">Calculated from every craving you resisted or redirected — never a black box.</p>
        </Card>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink-900">By trigger</h2>
          {data.byTrigger.length === 0 ? (
            <Card className="text-center text-sm text-ink-600">Your trends will show up here after your first week.</Card>
          ) : (
            <div className="flex flex-col divide-y divide-line-200 rounded-md border border-line-200 bg-surface-0">
              {data.byTrigger.map((row) => (
                <div key={row.trigger} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-ink-900">{row.trigger}</span>
                  <span className="tabular-nums text-sm font-semibold text-ink-600">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}
