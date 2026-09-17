"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

interface Goal {
  id: string;
  title: string;
  targetAmountPaise: number;
  progressPaise: number;
  percent: number;
  createdAt: string;
}

const SUGGESTED = ["New phone", "Family trip", "Emergency fund", "Just keep saving"];

// Keyword-based label, not a new data field — just a display hint for the
// "Redeems as" line the artifact shows next to each goal card.
function redeemsAs(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("phone") || t.includes("laptop") || t.includes("gadget")) return "Electronics voucher";
  if (t.includes("trip") || t.includes("travel") || t.includes("vacation")) return "Travel voucher";
  if (t.includes("emergency")) return "Cash equivalent";
  return "Cash equivalent";
}

function estimateCompletion(goal: Goal): string {
  const remaining = goal.targetAmountPaise - goal.progressPaise;
  if (remaining <= 0) return "Reached!";
  const daysSinceStart = Math.max(1, Math.floor((Date.now() - Date.parse(goal.createdAt)) / (1000 * 60 * 60 * 24)));
  const dailyRate = goal.progressPaise / daysSinceStart;
  if (dailyRate <= 0) return "Depends on your pace";
  const daysLeft = Math.ceil(remaining / dailyRate);
  const eta = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
  return eta.toLocaleDateString([], { month: "long", year: "numeric" });
}

export default function SavingsGoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  async function refresh() {
    const res = await apiFetch<Goal[]>("/api/goals");
    if (res.ok) setGoals(res.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createGoal() {
    const targetAmount = Number(target);
    if (!title.trim() || !targetAmount || targetAmount <= 0) return;
    const res = await apiFetch("/api/goals", { method: "POST", body: { title: title.trim(), targetAmountPaise: targetAmount } });
    if (res.ok) {
      setTitle("");
      setTarget("");
      setShowForm(false);
      refresh();
    }
  }

  function pickSuggestion(name: string) {
    setTitle(name);
    setShowForm(true);
  }

  return (
    <ScreenShell>
      <div className="mb-1 flex items-center gap-3">
        <button onClick={() => router.replace("/wallet")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line-200 bg-surface-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-ink-900">Savings Goals</h1>
      </div>

      {goals === null && <p className="mt-6 text-ink-600">Loading…</p>}

      {goals && goals.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.progressPaise / g.targetAmountPaise) * 100));
            return (
              <div key={g.id} className="rounded-[16px] border border-line-200 bg-surface-0 p-5">
                <p className="text-[17px] font-bold text-ink-900">{g.title}</p>
                <p className="mt-1.5 text-[15px] tabular-nums text-ink-600">
                  ₹{g.progressPaise} of ₹{g.targetAmountPaise} tracked
                </p>
                <div className="mt-3.5 h-2.5 overflow-hidden rounded-pill bg-surface-100">
                  <div className="h-full rounded-pill bg-redirect-600" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2.5 text-xs text-ink-300">Est. completion: {estimateCompletion(g)}</p>
                <p className="mt-0.5 text-xs font-semibold text-redirect-600">Redeems as: {redeemsAs(g.title)}</p>
              </div>
            );
          })}
        </div>
      )}

      {goals && goals.length === 0 && !showForm && <p className="mt-6 text-center text-sm text-ink-600">No goals yet — give your savings a name.</p>}

      {showForm ? (
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-line-200 bg-surface-0 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New phone"
            className="rounded-md border border-line-200 bg-surface-100 px-3 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-300"
          />
          <input
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
            placeholder="Target amount (₹)"
            className="rounded-md border border-line-200 bg-surface-100 px-3 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-300"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="redirect" className="flex-1" onClick={createGoal}>
              Create goal
            </Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-4 h-12 w-full rounded-pill border-[1.5px] border-dashed border-line-200 text-[15px] font-semibold text-redirect-600">
          + Add a goal
        </button>
      )}

      <p className="mt-7 text-[13px] font-semibold text-ink-600">SUGGESTED GOALS</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {SUGGESTED.map((s) => (
          <button key={s} onClick={() => pickSuggestion(s)} className="whitespace-nowrap rounded-pill border border-line-200 bg-surface-0 px-4 py-2.5 text-[13px] font-semibold text-ink-600">
            {s}
          </button>
        ))}
      </div>
    </ScreenShell>
  );
}
