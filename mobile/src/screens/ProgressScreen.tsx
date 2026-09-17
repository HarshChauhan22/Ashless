import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenShell, Card } from "../components/ui";
import { colors } from "../theme/tokens";
import { apiFetch } from "../lib/api";

interface ProgressData {
  streakDays: number;
  longestStreakDays: number;
  cigarettesAvoided: number;
  totalSavedPaise: string;
  byTrigger: { trigger: string; count: number }[];
}

// Matches webapp/app/(tabs)/progress/page.tsx (the "Track" tab) exactly
// (DECISIONS.md D-011/D-012).
export default function ProgressScreen() {
  const [data, setData] = useState<ProgressData | null>(null);

  useFocusEffect(
    useCallback(() => {
      apiFetch<ProgressData>("/progress").then((res) => res.ok && setData(res.data));
    }, []),
  );

  if (!data) {
    return (
      <ScreenShell>
        <Text style={{ color: colors.ink600 }}>Loading…</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <Text style={styles.title}>Track</Text>

      <Card tint="reward" style={{ alignItems: "center", paddingVertical: 32, marginTop: 16 }}>
        <Text style={styles.streakNum}>{data.streakDays}</Text>
        <Text style={styles.streakLabel}>days smoke-free</Text>
      </Card>

      <View style={styles.statRow}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statLabel}>LONGEST STREAK</Text>
          <Text style={styles.statValue}>{data.longestStreakDays}d</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.statLabel}>TOTAL SAVED</Text>
          <Text style={[styles.statValue, { color: colors.reward600 }]}>₹{data.totalSavedPaise}</Text>
        </Card>
      </View>

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.statLabel}>CIGARETTES AVOIDED</Text>
          <Text style={styles.statValue}>{data.cigarettesAvoided}</Text>
        </View>
        <Text style={styles.caption}>Calculated from every craving you resisted or redirected — never a black box.</Text>
      </Card>

      <Text style={styles.sectionLabel}>By trigger</Text>
      {data.byTrigger.length === 0 ? (
        <Card>
          <Text style={styles.caption}>Your trends will show up here after your first week.</Text>
        </Card>
      ) : (
        <ScrollView style={{ marginTop: 4 }}>
          {data.byTrigger.map((row) => (
            <View key={row.trigger} style={styles.triggerRow}>
              <Text style={styles.triggerLabel}>{row.trigger}</Text>
              <Text style={styles.triggerCount}>{row.count}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: colors.ink900 },
  streakNum: { fontSize: 44, fontWeight: "700", color: colors.reward600 },
  streakLabel: { fontSize: 13, fontWeight: "600", color: colors.ink600, marginTop: 4 },
  statRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statLabel: { fontSize: 11, fontWeight: "600", color: colors.ink300, letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.ink900, marginTop: 4 },
  caption: { fontSize: 12, color: colors.ink600, marginTop: 6 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.ink900, marginTop: 20, marginBottom: 8 },
  triggerRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line200, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, borderRadius: 12, padding: 14, marginBottom: 8 },
  triggerLabel: { fontSize: 14, color: colors.ink900 },
  triggerCount: { fontSize: 14, fontWeight: "700", color: colors.ink600 },
});
