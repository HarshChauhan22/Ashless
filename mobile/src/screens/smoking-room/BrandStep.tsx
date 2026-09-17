import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View, Pressable, StyleSheet, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button } from "../../components/ui";
import { colors, radii } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { BRAND_PRICES } from "../../lib/brandPrices";
import type { SmokingProfileClient } from "./types";

type Selection = { kind: "profile"; profile: SmokingProfileClient } | { kind: "catalog"; name: string };

// Matches webapp/app/craving/smoking-room/BrandStep.tsx and
// BrandSelection.dc.html (DECISIONS.md D-011/D-012): select-then-Continue
// radio list. Updated 2026-09-16 (DECISIONS.md D-013): the primary path is
// now always "pick a brand from the list, price auto-fills" — no manual
// brand-name typing or price entry for the 12 official reference brands.
// "I can't find my brand" remains as a fallback for brands genuinely not
// in that list, which still needs a manually entered price since there's
// nothing to look up.
export function BrandStep({
  profiles,
  onSelect,
  onProfileCreated,
}: {
  profiles: SmokingProfileClient[];
  onSelect: (profile: SmokingProfileClient) => void;
  onProfileCreated: (profile: SmokingProfileClient) => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [search, setSearch] = useState("");
  const [brandOptions, setBrandOptions] = useState<string[]>(Object.keys(BRAND_PRICES));
  const [customOpen, setCustomOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [pricingMode, setPricingMode] = useState<"pack" | "single_stick">("pack");
  const [packPrice, setPackPrice] = useState("");
  const [packSize, setPackSize] = useState("10");
  const [singleStickPrice, setSingleStickPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const usual = profiles.find((p) => p.isPrimary);
    if (usual && !selection) setSelection({ kind: "profile", profile: usual });
  }, [profiles]);

  useEffect(() => {
    apiFetch<{ displayName: string }[]>("/catalog/brands").then((res) => {
      if (res.ok && res.data.length > 0) setBrandOptions(res.data.map((b) => b.displayName));
    });
  }, []);

  const visibleCatalogBrands = useMemo(() => {
    const savedLabels = new Set(profiles.map((p) => p.brandLabel.toLowerCase()));
    return brandOptions.filter(
      (b) => !savedLabels.has(b.toLowerCase()) && (!search.trim() || b.toLowerCase().includes(search.trim().toLowerCase())),
    );
  }, [search, profiles, brandOptions]);

  const costPreview = useMemo(() => {
    if (pricingMode === "pack") {
      const p = Number(packPrice);
      const s = Number(packSize);
      return p > 0 && s > 0 ? Math.round(p / s) : null;
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
    const res = await apiFetch<SmokingProfileClient>("/smoking-profiles", {
      method: "POST",
      body: {
        brandLabel: brandName.trim(),
        pricingMode,
        packPricePaise: pricingMode === "pack" ? Number(packPrice) : undefined,
        packSize: pricingMode === "pack" ? Number(packSize) : undefined,
        costPerStickPaise: pricingMode === "single_stick" ? Number(singleStickPrice) : undefined,
      },
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onProfileCreated(res.data);
  }

  async function handleContinue() {
    if (!selection) return;
    if (selection.kind === "profile") {
      onSelect(selection.profile);
      return;
    }
    // Catalog brand — price auto-resolved from BRAND_PRICES, never typed.
    setSaving(true);
    setError(null);
    const res = await apiFetch<SmokingProfileClient>("/smoking-profiles", {
      method: "POST",
      body: { brandLabel: selection.name, pricingMode: "single_stick", costPerStickPaise: BRAND_PRICES[selection.name] },
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onProfileCreated(res.data);
  }

  if (customOpen) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }}>
        <Text style={styles.label}>Brand name</Text>
        <TextInput value={brandName} onChangeText={setBrandName} placeholder="e.g. Gold Flake" placeholderTextColor={colors.ink300} style={styles.input} />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => setPricingMode("pack")} style={[styles.toggle, pricingMode === "pack" && styles.toggleActive]}>
            <Text style={[styles.toggleText, pricingMode === "pack" && styles.toggleTextActive]}>Pack price</Text>
          </Pressable>
          <Pressable onPress={() => setPricingMode("single_stick")} style={[styles.toggle, pricingMode === "single_stick" && styles.toggleActive]}>
            <Text style={[styles.toggleText, pricingMode === "single_stick" && styles.toggleTextActive]}>Single sticks only</Text>
          </Pressable>
        </View>

        {pricingMode === "pack" ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.label}>Pack price (₹)</Text>
              <TextInput
                keyboardType="number-pad"
                value={packPrice}
                onChangeText={(t) => setPackPrice(t.replace(/\D/g, ""))}
                placeholder="200"
                placeholderTextColor={colors.ink300}
                style={styles.input}
              />
            </View>
            <View style={{ width: 110, gap: 6 }}>
              <Text style={styles.label}>Per pack</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {["10", "20"].map((s) => (
                  <Pressable key={s} onPress={() => setPackSize(s)} style={[styles.sizeChip, packSize === s && styles.toggleActive]}>
                    <Text style={styles.toggleText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Price per cigarette (₹)</Text>
            <TextInput
              keyboardType="number-pad"
              value={singleStickPrice}
              onChangeText={(t) => setSingleStickPrice(t.replace(/\D/g, ""))}
              placeholder="15"
              placeholderTextColor={colors.ink300}
              style={styles.input}
            />
          </View>
        )}

        {costPreview !== null && <Text style={styles.costPreview}>= ₹{costPreview} per cigarette</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <Button variant="redirect" disabled={saving} onPress={submitCustomBrand}>
          {saving ? "Saving…" : "Use this brand"}
        </Button>
        <Pressable onPress={() => setCustomOpen(false)}>
          <Text style={styles.backLink}>← Back to brand list</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Which one would it have been?</Text>
      <Text style={styles.subtitle}>We&apos;ll use its price to track what this craving would have cost you.</Text>

      <ScrollView style={{ flex: 1, marginTop: 24 }} contentContainerStyle={{ gap: 10 }}>
        {profiles.map((p) => {
          const isSelected = selection?.kind === "profile" && selection.profile.id === p.id;
          return (
            <Pressable key={p.id} onPress={() => setSelection({ kind: "profile", profile: p })} style={[styles.brandRow, isSelected && styles.brandRowSelected]}>
              <Text style={styles.brandLabel}>{p.brandLabel}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={styles.brandPrice}>₹{p.costPerStickPaise} / stick</Text>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M20 6 9 17l-5-5" />
                    </Svg>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search for a brand"
          placeholderTextColor={colors.ink300}
          style={styles.input}
        />
        {visibleCatalogBrands.map((name) => {
          const isSelected = selection?.kind === "catalog" && selection.name === name;
          const price = BRAND_PRICES[name];
          return (
            <Pressable key={name} onPress={() => setSelection({ kind: "catalog", name })} style={[styles.brandRow, isSelected && styles.brandRowSelected]}>
              <Text style={styles.brandLabel}>{name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {price !== undefined && <Text style={styles.brandPrice}>₹{price} / stick</Text>}
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M20 6 9 17l-5-5" />
                    </Svg>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        <Pressable onPress={() => setCustomOpen(true)}>
          <Text style={styles.backLink}>I can&apos;t find my brand</Text>
        </Pressable>
      </ScrollView>

      {error && <Text style={styles.error}>{error}</Text>}
      <View style={{ paddingTop: 16 }}>
        <Button variant="redirect" disabled={!selection || saving} onPress={handleContinue}>
          {saving ? "Saving…" : "Continue"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900, lineHeight: 28 },
  subtitle: { fontSize: 14, color: colors.ink600, marginTop: 8, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink600 },
  input: {
    borderWidth: 1,
    borderColor: colors.line200,
    backgroundColor: colors.surface0,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.ink900,
    fontSize: 15,
  },
  toggle: { flex: 1, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, paddingVertical: 10, alignItems: "center" },
  toggleActive: { borderColor: colors.redirect600, backgroundColor: colors.redirect100 },
  toggleText: { fontSize: 13, fontWeight: "600", color: colors.ink600 },
  toggleTextActive: { color: colors.redirect600 },
  sizeChip: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.line200, paddingVertical: 12, alignItems: "center" },
  costPreview: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  error: { fontSize: 14, color: colors.alert600 },
  backLink: { fontSize: 14, fontWeight: "600", color: colors.redirect600, textDecorationLine: "underline", paddingVertical: 4 },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.line200,
    backgroundColor: colors.surface0,
    padding: 14,
  },
  brandRowSelected: { borderColor: colors.redirect600, backgroundColor: colors.redirect100 },
  brandLabel: { fontSize: 15, fontWeight: "600", color: colors.ink900 },
  brandPrice: { fontSize: 14, color: colors.ink600 },
  checkCircle: { width: 22, height: 22, borderRadius: radii.pill, backgroundColor: colors.redirect600, alignItems: "center", justifyContent: "center" },
});
