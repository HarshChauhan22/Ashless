import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View, ScrollView, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ScreenShell, Button } from "../components/ui";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

interface Goal {
  id: string;
  title: string;
  targetAmountPaise: string;
  progressPaise: string;
  percent: number;
  createdAt: string;
}

const SUGGESTED = ["New phone", "Family trip", "Emergency fund", "Just keep saving"];

function redeemsAs(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("phone") || t.includes("laptop") || t.includes("gadget")) return "Electronics voucher";
  if (t.includes("trip") || t.includes("travel") || t.includes("vacation")) return "Travel voucher";
  return "Cash equivalent";
}

function estimateCompletion(goal: Goal): string {
  const target = Number(goal.targetAmountPaise);
  const progress = Number(goal.progressPaise);
  const remaining = target - progress;
  if (remaining <= 0) return "Reached!";
  const daysSinceStart = Math.max(1, Math.floor((Date.now() - Date.parse(goal.createdAt)) / (1000 * 60 * 60 * 24)));
  const dailyRate = progress / daysSinceStart;
  if (dailyRate <= 0) return "Depends on your pace";
  const daysLeft = Math.ceil(remaining / dailyRate);
  const eta = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
  return eta.toLocaleDateString([], { month: "long", year: "numeric" });
}

// Matches webapp/app/(tabs)/wallet/goals/page.tsx and SavingsGoals.dc.html
// exactly (DECISIONS.md D-011/D-012).
export default function SavingsGoalsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "SavingsGoals">) {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  async function refresh() {
    const res = await apiFetch<Goal[]>("/goals");
    if (res.ok) setGoals(res.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createGoal() {
    const targetAmount = Number(target);
    if (!title.trim() || !targetAmount || targetAmount <= 0) return;
    const res = await apiFetch("/goals", { method: "POST", body: { title: title.trim(), targetAmountPaise: targetAmount } });
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
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink900} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m15 18-6-6 6-6" />
          </Svg>
        </Pressable>
        <Text style={styles.title}>Savings Goals</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {goals === null && <Text style={{ color: colors.ink600, marginTop: 24 }}>Loading…</Text>}

        {goals && goals.length > 0 && (
          <View style={{ gap: 12, marginTop: 24 }}>
            {goals.map((g) => (
              <View key={g.id} style={styles.goalCard}>
                <Text style={styles.goalTitle}>{g.title}</Text>
                <Text style={styles.goalAmount}>
                  ₹{g.progressPaise} of ₹{g.targetAmountPaise} tracked
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, g.percent)}%` }]} />
                </View>
                <Text style={styles.eta}>Est. completion: {estimateCompletion(g)}</Text>
                <Text style={styles.redeems}>Redeems as: {redeemsAs(g.title)}</Text>
              </View>
            ))}
          </View>
        )}

        {goals && goals.length === 0 && !showForm && <Text style={styles.empty}>No goals yet — give your savings a name.</Text>}

        {showForm ? (
          <View style={styles.form}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. New phone"
              placeholderTextColor={colors.ink300}
              style={styles.input}
            />
            <TextInput
              keyboardType="number-pad"
              value={target}
              onChangeText={(t) => setTarget(t.replace(/\D/g, ""))}
              placeholder="Target amount (₹)"
              placeholderTextColor={colors.ink300}
              style={styles.input}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button variant="outline" style={{ flex: 1 }} onPress={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="redirect" style={{ flex: 1 }} onPress={createGoal}>
                Create goal
              </Button>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setShowForm(true)} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add a goal</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>SUGGESTED GOALS</Text>
        <View style={styles.chipRow}>
          {SUGGESTED.map((s) => (
            <Pressable key={s} onPress={() => pickSuggestion(s)} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 36, height: 36, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink900 },
  goalCard: { borderRadius: 16, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, padding: 20 },
  goalTitle: { fontSize: 17, fontWeight: "700", color: colors.ink900 },
  goalAmount: { fontSize: 15, color: colors.ink600, marginTop: 6 },
  track: { height: 10, borderRadius: radii.pill, backgroundColor: colors.surface100, overflow: "hidden", marginTop: 14 },
  fill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.redirect600 },
  eta: { fontSize: 12, color: colors.ink300, marginTop: 10 },
  redeems: { fontSize: 12, fontWeight: "600", color: colors.redirect600, marginTop: 2 },
  empty: { fontSize: 14, color: colors.ink600, textAlign: "center", marginTop: 24 },
  form: { marginTop: 16, gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, padding: 16 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface100, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink900, fontSize: 14 },
  addButton: { marginTop: 16, height: 48, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.line200, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  addButtonText: { fontSize: 15, fontWeight: "600", color: colors.redirect600 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.ink600, marginTop: 28 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  chip: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.ink600 },
});
