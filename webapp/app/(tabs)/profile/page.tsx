"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell, Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/store/session";
import type { SmokingProfile, SavingsDestination } from "@/lib/db";

export default function ProfilePage() {
  const router = useRouter();
  const { phoneNumber, logout } = useSession();
  const [profiles, setProfiles] = useState<SmokingProfile[]>([]);
  const [destinations, setDestinations] = useState<SavingsDestination[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [newDestLabel, setNewDestLabel] = useState("");
  const [showAddDest, setShowAddDest] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ cravingReminders: true, streakNudges: true, paymentUpdates: true });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function refresh() {
    const [p, d] = await Promise.all([
      apiFetch<SmokingProfile[]>("/api/smoking-profiles"),
      apiFetch<SavingsDestination[]>("/api/savings-destinations"),
    ]);
    if (p.ok) setProfiles(p.data);
    if (d.ok) setDestinations(d.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setPrimary(id: string) {
    await apiFetch(`/api/smoking-profiles/${id}`, { method: "PATCH", body: { isPrimary: true } });
    refresh();
  }

  async function saveEdit(id: string) {
    const price = Number(editPrice);
    if (!price || price <= 0) return;
    await apiFetch(`/api/smoking-profiles/${id}`, {
      method: "PATCH",
      body: { pricingMode: "single_stick", costPerStickPaise: price },
    });
    setEditingId(null);
    refresh();
  }

  async function deleteProfile(id: string) {
    setDeleteError(null);
    const res = await apiFetch(`/api/smoking-profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleteError(res.error.message);
      return;
    }
    refresh();
  }

  async function addDestination() {
    if (!newDestLabel.trim()) return;
    await apiFetch("/api/savings-destinations", { method: "POST", body: { label: newDestLabel.trim() } });
    setNewDestLabel("");
    setShowAddDest(false);
    refresh();
  }

  function doLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <ScreenShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{phoneNumber ? `+91 ${phoneNumber}` : "Profile"}</h1>
          <p className="text-sm text-ink-600">Member here</p>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Smoking Profiles</h2>
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <Card key={p.id}>
                {editingId === p.id ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-ink-900">{p.brandLabel}</p>
                    <input
                      inputMode="numeric"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ""))}
                      placeholder="New price per cigarette (₹)"
                      className="rounded-md border border-line-200 px-3 py-2 text-sm outline-none"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button variant="redirect" className="flex-1" onClick={() => saveEdit(p.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink-900">{p.brandLabel}</p>
                        {p.isPrimary && (
                          <span className="rounded-pill bg-redirect-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-redirect-600">
                            Usual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-600">₹{p.costPerStickPaise}/stick</p>
                    </div>
                    <div className="flex gap-3 text-xs font-medium">
                      {!p.isPrimary && (
                        <button className="text-redirect-600" onClick={() => setPrimary(p.id)}>
                          Set usual
                        </button>
                      )}
                      <button
                        className="text-ink-600"
                        onClick={() => {
                          setEditingId(p.id);
                          setEditPrice(String(p.costPerStickPaise));
                        }}
                      >
                        Edit
                      </button>
                      <button className="text-alert-600" onClick={() => deleteProfile(p.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
            {profiles.length === 0 && <Card className="text-center text-sm text-ink-600">No profiles yet — set one up in the Smoking Room.</Card>}
            {deleteError && <p className="text-xs text-alert-600">{deleteError}</p>}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Payment &amp; Savings Destination</h2>
            <button className="text-xs font-medium text-redirect-600" onClick={() => setShowAddDest((s) => !s)}>
              {showAddDest ? "Cancel" : "+ Add"}
            </button>
          </div>
          {showAddDest && (
            <Card className="mb-2 flex flex-col gap-2">
              <input
                value={newDestLabel}
                onChange={(e) => setNewDestLabel(e.target.value)}
                placeholder="e.g. you@okhdfcbank"
                className="rounded-md border border-line-200 px-3 py-2 text-sm outline-none"
              />
              <Button variant="redirect" onClick={addDestination}>
                Link destination
              </Button>
            </Card>
          )}
          {destinations.length === 0 && !showAddDest ? (
            <Card className="text-center text-sm text-ink-600">No destination set yet.</Card>
          ) : (
            destinations.map((d) => (
              <Card key={d.id} className="flex items-center justify-between">
                <p className="text-sm text-ink-900">{d.label}</p>
                {d.isDefault && <span className="text-xs font-medium text-reward-600">Default</span>}
              </Card>
            ))
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Notifications</h2>
          <Card className="flex flex-col gap-3">
            {(
              [
                ["cravingReminders", "Craving check-in reminders"],
                ["streakNudges", "Streak & milestone nudges"],
                ["paymentUpdates", "Payment status updates"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between text-sm text-ink-900">
                {label}
                <input
                  type="checkbox"
                  checked={notifPrefs[key]}
                  onChange={(e) => setNotifPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                  className="h-5 w-5 accent-redirect-600"
                />
              </label>
            ))}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Account &amp; Privacy</h2>
          <Card className="flex flex-col gap-2">
            <button className="text-left text-sm text-ink-900">Export my data</button>
            <button className="text-left text-sm text-alert-600">Delete account</button>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Help &amp; Support</h2>
          <Card className="flex flex-col gap-3 text-sm text-ink-900">
            <button className="text-left font-medium text-redirect-600" onClick={() => router.push("/coach")}>
              Talk to AI Coach
            </button>
            <div>
              <p>Need help? Contact support or find a helpline.</p>
              <p className="text-xs text-ink-600">iCall: 9152987821 · KIRAN: 1800-599-0019</p>
            </div>
          </Card>
        </section>

        <Button variant="outline" onClick={doLogout}>
          Log out
        </Button>
      </div>
    </ScreenShell>
  );
}
