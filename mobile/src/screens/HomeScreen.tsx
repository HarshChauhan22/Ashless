import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ScreenShell } from "../components/ui";
import { ProgressRing } from "../components/ProgressRing";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";

interface StreakData {
  streakDays: number;
}
interface WalletData {
  balancePaise: string;
}
interface Goal {
  id: string;
  title: string;
  targetAmountPaise: string;
  progressPaise: string;
  percent: number;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Matches webapp/app/(tabs)/home/page.tsx and, before that, Main.dc.html
// (DECISIONS.md D-011/D-012). Nested inside TabsNavigator, so navigation to
// the craving flow (a root-stack screen, outside the tab chrome) goes via
// getParent() rather than this screen's own (tab) navigator.
export default function HomeScreen({ navigation }: { navigation: any }) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topGoal, setTopGoal] = useState<Goal | null>(null);

  const refresh = useCallback(() => {
    apiFetch<StreakData>("/streak").then((res) => res.ok && setStreak(res.data));
    apiFetch<WalletData>("/wallet").then((res) => res.ok && setWallet(res.data));
    apiFetch<Goal[]>("/goals").then((res) => res.ok && res.data.length > 0 && setTopGoal(res.data[0]));
  }, []);

  useFocusEffect(refresh);

  async function startCraving() {
    const res = await apiFetch<{ id: string }>("/craving-sessions", { method: "POST" });
    if (res.ok) navigation.getParent()?.navigate("CravingHub", { cravingSessionId: res.data.id });
  }

  if (!streak || !wallet) {
    return (
      <ScreenShell>
        <Text style={{ color: colors.ink600 }}>Loading…</Text>
      </ScreenShell>
    );
  }

  const ringPct = Math.max(4, Math.min(100, Math.round((streak.streakDays / 30) * 100)));
  const goalPct = topGoal ? topGoal.percent : 0;

  return (
    <ScreenShell>
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <View style={styles.bellButton}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.ink900} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </Svg>
        </View>
      </View>

      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <ProgressRing size={180} strokeWidth={14} percent={ringPct} color={colors.reward600}>
          <Text style={styles.streakNum}>{streak.streakDays}</Text>
          <Text style={styles.streakLabel}>{streak.streakDays === 1 ? "day smoke-free" : "days smoke-free"}</Text>
        </ProgressRing>
      </View>

      <View style={styles.savedCard}>
        <View>
          <Text style={styles.savedLabel}>Total saved so far</Text>
          <Text style={styles.savedAmount}>₹{wallet.balancePaise}</Text>
        </View>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.reward600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
          <Path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        </Svg>
      </View>

      <View style={{ marginTop: 20, alignItems: "center", gap: 8 }}>
        <Pressable onPress={startCraving} style={styles.cravingButton}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </Svg>
          <Text style={styles.cravingButtonText}>I&apos;m craving</Text>
        </Pressable>
        <Text style={styles.cravingSubtext}>It&apos;s okay. Let&apos;s deal with it together.</Text>
      </View>

      {topGoal && (
        <Pressable onPress={() => navigation.getParent()?.navigate("SavingsGoals")} style={styles.goalCard}>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>{topGoal.title} goal</Text>
            <Text style={styles.goalLabel}>
              ₹{topGoal.progressPaise} / ₹{topGoal.targetAmountPaise}
            </Text>
          </View>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${goalPct}%` }]} />
          </View>
        </Pressable>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 13, color: colors.ink600 },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line200,
    backgroundColor: colors.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
  streakNum: { fontSize: 36, fontWeight: "700", color: colors.reward600 },
  streakLabel: { fontSize: 12, color: colors.ink600, marginTop: 4 },
  savedCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.reward100,
    borderRadius: radii.md,
    padding: 16,
  },
  savedLabel: { fontSize: 12, color: colors.ink600 },
  savedAmount: { fontSize: 24, fontWeight: "700", color: colors.reward600, marginTop: 4 },
  cravingButton: {
    height: 56,
    width: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.craving500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cravingButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cravingSubtext: { fontSize: 13, color: colors.ink600 },
  goalCard: {
    marginTop: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line200,
    backgroundColor: colors.surface0,
    padding: 14,
  },
  goalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  goalLabel: { fontSize: 13, color: colors.ink600 },
  goalTrack: { height: 8, borderRadius: radii.pill, backgroundColor: colors.surface100, overflow: "hidden" },
  goalFill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.redirect600 },
});
