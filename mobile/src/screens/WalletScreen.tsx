import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, Text, View, ScrollView, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { ScreenShell } from "../components/ui";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";

interface WalletActivityItem {
  id: string;
  kind: "redirected" | "relapse";
  amountPaise?: string;
  createdAt: string;
}
interface WalletData {
  balancePaise: string;
  activity: WalletActivityItem[];
  thisMonthPaise: string;
  redirectedThisMonth: number;
}
interface Goal {
  id: string;
  title: string;
  targetAmountPaise: string;
  progressPaise: string;
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

// Matches webapp/app/(tabs)/wallet/page.tsx and QuitWallet.dc.html exactly
// (DECISIONS.md D-011/D-012).
export default function WalletScreen({ navigation }: { navigation: any }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topGoal, setTopGoal] = useState<Goal | null>(null);
  const [howThisWorksOpen, setHowThisWorksOpen] = useState(false);

  const refresh = useCallback(() => {
    apiFetch<WalletData>("/wallet").then((res) => res.ok && setWallet(res.data));
    apiFetch<Goal[]>("/goals").then((res) => res.ok && res.data.length > 0 && setTopGoal(res.data[0]));
  }, []);

  useFocusEffect(refresh);

  if (!wallet) {
    return (
      <ScreenShell>
        <Text style={{ color: colors.ink600 }}>Loading…</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <Text style={styles.title}>Quit Wallet</Text>

      <View style={styles.totalBlock}>
        <Text style={styles.totalLabel}>Total tracked savings</Text>
        <Text style={styles.totalAmount}>₹{wallet.balancePaise}</Text>
        <Pressable onPress={() => setHowThisWorksOpen((v) => !v)}>
          <Text style={styles.howLink}>How this works</Text>
        </Pressable>
        {howThisWorksOpen && (
          <Text style={styles.howText}>
            Every time you redirect a craving in the Digital Smoking Room, the exact amount that cigarette would have cost moves straight
            into this ledger — real money, tracked here, never sent to a cigarette seller.
          </Text>
        )}
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>This month</Text>
          <Text style={styles.statValue}>₹{wallet.thisMonthPaise}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Cravings redirected</Text>
          <Text style={styles.statValue}>{wallet.redirectedThisMonth}</Text>
        </View>
      </View>

      <View style={styles.redeemButton}>
        <Text style={styles.redeemText}>Redeem — voucher or donation</Text>
      </View>

      {topGoal ? (
        <Pressable onPress={() => navigation.getParent()?.navigate("SavingsGoals")} style={styles.goalCard}>
          <View style={styles.goalRow}>
            <Text style={styles.goalTitle}>{topGoal.title}</Text>
            <Text style={styles.goalAmount}>
              ₹{topGoal.progressPaise} / ₹{topGoal.targetAmountPaise}
            </Text>
          </View>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${topGoal.percent}%` }]} />
          </View>
        </Pressable>
      ) : (
        <Pressable onPress={() => navigation.getParent()?.navigate("SavingsGoals")} style={styles.addGoalButton}>
          <Text style={styles.addGoalText}>+ Add a savings goal</Text>
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
      <ScrollView style={{ flex: 1, marginTop: 8 }}>
        {wallet.activity.length === 0 && <Text style={styles.empty}>Your first save will show up here.</Text>}
        {wallet.activity.map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: item.kind === "redirected" ? colors.reward100 : colors.surface100 }]}>
              {item.kind === "redirected" ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.reward600} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 19V5M5 12l7-7 7 7" />
                </Svg>
              ) : (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink600} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx={12} cy={12} r={9} />
                  <Path d="M12 8v4l3 2" />
                </Svg>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>{item.kind === "redirected" ? "Redirected craving" : "Logged a smoke · streak reset"}</Text>
              <Text style={styles.activityWhen}>{formatWhen(item.createdAt)}</Text>
            </View>
            {item.kind === "redirected" && <Text style={styles.activityAmount}>+₹{item.amountPaise}</Text>}
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: colors.ink900 },
  totalBlock: { alignItems: "center", paddingTop: 20, paddingBottom: 4 },
  totalLabel: { fontSize: 13, color: colors.ink600 },
  totalAmount: { fontSize: 44, fontWeight: "700", color: colors.reward600, marginTop: 4 },
  howLink: { fontSize: 12, fontWeight: "600", color: colors.redirect600, textDecorationLine: "underline", marginTop: 4 },
  howText: { fontSize: 12, color: colors.ink600, marginTop: 8, textAlign: "center", lineHeight: 17, maxWidth: 320 },
  statRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, padding: 14 },
  statLabel: { fontSize: 12, color: colors.ink600 },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.ink900, marginTop: 4 },
  redeemButton: { marginTop: 12, height: 44, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.redirect600, alignItems: "center", justifyContent: "center" },
  redeemText: { fontSize: 14, fontWeight: "600", color: colors.redirect600 },
  goalCard: { marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, padding: 16 },
  goalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  goalTitle: { fontSize: 13, fontWeight: "600", color: colors.ink900 },
  goalAmount: { fontSize: 13, color: colors.ink600 },
  goalTrack: { height: 8, borderRadius: radii.pill, backgroundColor: colors.surface100, overflow: "hidden" },
  goalFill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.redirect600 },
  addGoalButton: { marginTop: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line200, borderStyle: "dashed", padding: 16, alignItems: "center" },
  addGoalText: { fontSize: 14, fontWeight: "600", color: colors.redirect600 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.ink600, marginTop: 24 },
  empty: { fontSize: 14, color: colors.ink600, textAlign: "center", paddingVertical: 16 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line200, paddingVertical: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  activityWhen: { fontSize: 12, color: colors.ink300, marginTop: 1 },
  activityAmount: { fontSize: 14, fontWeight: "700", color: colors.reward600 },
});
