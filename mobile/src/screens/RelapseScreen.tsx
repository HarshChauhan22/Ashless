import { useEffect, useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ScreenShell, Button } from "../components/ui";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

const TRIGGERS = ["Stress", "Social", "Habit", "Alcohol", "Other"];

interface WalletData {
  balancePaise: string;
}

// Matches webapp/app/craving/relapse/page.tsx and RelapseFlow.dc.html
// exactly (DECISIONS.md D-011/D-012): optional trigger chips, a
// reassurance card that only the streak resets, a link out to the AI
// Coach (not yet built on mobile — falls through to ComingSoon for now).
export default function RelapseScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Relapse">) {
  const cravingSessionId = route.params?.cravingSessionId;
  const [trigger, setTrigger] = useState<string | null>(null);
  const [balancePaise, setBalancePaise] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    apiFetch<WalletData>("/wallet").then((res) => {
      if (res.ok) setBalancePaise(res.data.balancePaise);
    });
  }, []);

  async function logIt() {
    setLogging(true);
    if (cravingSessionId) {
      await apiFetch(`/craving-sessions/${cravingSessionId}`, { method: "PATCH", body: { outcome: "smoked", trigger: trigger ?? undefined } });
    } else {
      await apiFetch("/relapse", { method: "POST", body: { trigger } });
    }
    navigation.navigate("Tabs");
  }

  return (
    <ScreenShell>
      <Text style={styles.title}>You smoked. That&apos;s okay — let&apos;s log it and keep going.</Text>

      <Text style={styles.sectionLabel}>WHAT TRIGGERED IT? (OPTIONAL)</Text>
      <View style={styles.chipRow}>
        {TRIGGERS.map((t) => (
          <Pressable key={t} onPress={() => setTrigger(trigger === t ? null : t)} style={[styles.chip, trigger === t && styles.chipActive]}>
            <Text style={[styles.chipText, trigger === t && styles.chipTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.infoCard}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.reward600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" />
        </Svg>
        <Text style={styles.infoText}>
          Your streak will reset to 0. Your <Text style={{ fontWeight: "700" }}>total tracked savings of ₹{balancePaise ?? "…"}</Text> stay
          exactly where they are.
        </Text>
      </View>

      <Button variant="redirect" onPress={logIt} disabled={logging} style={{ marginTop: 16 }}>
        {logging ? "Logging…" : "Log it"}
      </Button>
      <Pressable onPress={() => navigation.navigate("Coach")}>
        <Text style={styles.coachLink}>Talk to AI Coach about this</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 23, fontWeight: "700", color: colors.ink900, lineHeight: 29, marginTop: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.ink600, marginTop: 32 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { borderColor: colors.redirect600, backgroundColor: colors.redirect100 },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.ink600 },
  chipTextActive: { color: colors.redirect600 },
  infoCard: { flexDirection: "row", gap: 10, borderRadius: 14, backgroundColor: colors.reward100, padding: 18 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink900 },
  coachLink: { textAlign: "center", fontSize: 13, fontWeight: "600", color: colors.redirect600, marginTop: 14 },
});
