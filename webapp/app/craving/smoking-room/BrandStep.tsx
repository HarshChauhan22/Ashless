"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { BRAND_REFERENCE_LIST } from "@/lib/brands";
import { apiFetch } from "@/lib/api-client";
import type { SmokingProfileClient } from "./types";

// Matches BrandSelection.dc.html exactly (DECISIONS.md D-011): a select-then-
// Continue radio list, not tap-to-advance cards. Trademark note: the
// artifact's own mockup uses "Marlboro Advance" as a placeholder; this app
// keeps the project's official, trademark-safe 12-brand list (D-008), which
// already contains "Advance" without the real brand prefix.
export function BrandStep({
  profiles,
  onSelect,
  onProfileCreated,
}: {
  profiles: SmokingProfileClient[];
  onSelect: (profile: SmokingProfileClient) => void;
  onProfileCreated: (profile: SmokingProfileClient) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customOpen, setCustomOpen] = useState(profiles.length === 0);
  const [brandName, setBrandName] = useState("");
  const [pricingMode, setPricingMode] = useState<"pack" | "single_stick">("pack");
  const [packPrice, setPackPrice] = useState("");
  const [packSize, setPackSize] = useState("10");
  const [singleStickPrice, setSingleStickPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const usual = profiles.find((p) => p.isPrimary);
    if (usual && !selectedId) setSelectedId(usual.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  const filteredReference = useMemo(() => {
    if (!search.trim()) return [];
    const savedLabels = new Set(profiles.map((p) => p.brandLabel.toLowerCase()));
    return BRAND_REFERENCE_LIST.filter(
      (b) => b.toLowerCase().includes(search.trim().toLowerCase()) && !savedLabels.has(b.toLowerCase())
    );
  }, [search, profiles]);

  const costPreview = useMemo(() => {
    if (pricingMode === "pack") {
      const p = Number(packPrice);
      const s = Number(packSize);
      if (p > 0 && s > 0) return Math.round(p / s);
      return null;
    }
    const s = Number(singleStickPrice);
    return s > 0 ? s : null;
  }, [pricingMode, packPrice, packSize, singleStickPrice]);

  async function submitCustomBrand() {
    setError(null);
    if (!brandName.trim()) {
      setError("Enter a brand name.");
      return;
    }
    setSaving(true);
    const res = await apiFetch<SmokingProfileClient>("/api/smoking-profiles", {
      method: "POST",
      body: {
        brandLabel: brandName.trim(),
        pricingMode,
        packPricePaise: pricingMode === "pack" ? Number(packPrice) : undefined,
        packSize: pricingMode === "pack" ? Number(packSize) : undefined,
        costPerStickPaise: pricingMode === "single_stick" ? Number(singleStickPrice) : undefined,
        entryPoint: "smoking_room",
      },
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onProfileCreated(res.data);
  }

  function selectAndPrefill(name: string) {
    setBrandName(name);
    setCustomOpen(true);
    setSearch("");
  }

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      {!customOpen && (
        <>
          <h1 className="text-[22px] font-bold leading-tight text-ink-900">Which one would it have been?</h1>
          <p className="mt-2 text-sm leading-snug text-ink-600">We&apos;ll use its price to track what this craving would have cost you.</p>

          <div className="mt-6 flex flex-1 flex-col gap-2.5 overflow-y-auto">
            {profiles.map((p) => {
              const isSelected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`flex items-center justify-between rounded-md border-[1.5px] p-3.5 text-left ${
                    isSelected ? "border-redirect-600 bg-redirect-100" : "border-line-200 bg-surface-0"
                  }`}
                >
                  <span className="text-[15px] font-semibold text-ink-900">{p.brandLabel}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="tabular-nums text-sm text-ink-600">₹{p.costPerStickPaise} / stick</span>
                    {isSelected && (
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-redirect-600">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a brand"
              className="w-full rounded-md border border-line-200 bg-surface-0 px-4 py-3 text-ink-900 outline-none placeholder:text-ink-300"
            />
            {filteredReference.map((name) => (
              <button key={name} onClick={() => selectAndPrefill(name)} className="rounded-md border border-line-200 bg-surface-0 px-4 py-3 text-left text-ink-900">
                {name}
              </button>
            ))}

            <button onClick={() => setCustomOpen(true)} className="py-1 text-left text-sm font-medium text-redirect-600 underline">
              I can&apos;t find my brand
            </button>
          </div>

          <div className="pt-4">
            <Button variant="redirect" disabled={!selected} onClick={() => selected && onSelect(selected)}>
              Continue
            </Button>
          </div>
        </>
      )}

      {customOpen && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-600">Brand name</span>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Gold Flake"
              className="rounded-md border border-line-200 bg-surface-0 px-4 py-3 text-ink-900 outline-none placeholder:text-ink-300"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => setPricingMode("pack")}
              className={`flex-1 rounded-pill border px-4 py-2 text-sm font-medium ${pricingMode === "pack" ? "border-redirect-600 bg-redirect-100 text-redirect-600" : "border-line-200 text-ink-600"}`}
            >
              Pack price
            </button>
            <button
              onClick={() => setPricingMode("single_stick")}
              className={`flex-1 rounded-pill border px-4 py-2 text-sm font-medium ${pricingMode === "single_stick" ? "border-redirect-600 bg-redirect-100 text-redirect-600" : "border-line-200 text-ink-600"}`}
            >
              Single sticks only
            </button>
          </div>

          {pricingMode === "pack" ? (
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-600">Pack price (₹)</span>
                <input
                  inputMode="numeric"
                  value={packPrice}
                  onChange={(e) => setPackPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="200"
                  className="rounded-md border border-line-200 bg-surface-0 px-4 py-3 text-ink-900 outline-none placeholder:text-ink-300"
                />
              </label>
              <label className="flex w-28 flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-600">Per pack</span>
                <div className="flex gap-1">
                  {["10", "20"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPackSize(s)}
                      className={`flex-1 rounded-sm border px-2 py-3 text-sm ${packSize === s ? "border-redirect-600 bg-redirect-100" : "border-line-200"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-600">Price per cigarette (₹)</span>
              <input
                inputMode="numeric"
                value={singleStickPrice}
                onChange={(e) => setSingleStickPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="15"
                className="rounded-md border border-line-200 bg-surface-0 px-4 py-3 text-ink-900 outline-none placeholder:text-ink-300"
              />
            </label>
          )}

          {costPreview !== null && <p className="tabular-nums text-sm font-semibold text-ink-900">= ₹{costPreview} per cigarette</p>}
          {error && <p className="text-sm text-alert-600">{error}</p>}

          <Button variant="redirect" disabled={saving} onClick={submitCustomBrand}>
            {saving ? "Saving…" : "Use this brand"}
          </Button>
          {profiles.length > 0 && (
            <button className="text-sm text-ink-600" onClick={() => setCustomOpen(false)}>
              ← Back to brand list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
