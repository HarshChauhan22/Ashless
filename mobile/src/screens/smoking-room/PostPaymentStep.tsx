import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { Button } from "../../components/ui";
import { ProgressRing } from "../../components/ProgressRing";
import { colors } from "../../theme/tokens";
import { useCountdown } from "../../lib/useCountdown";

type Phase = "timer" | "satisfaction" | "reinforcement";

// The post-payment "sit with it" screen (9a). Matches
// webapp/app/craving/smoking-room/PostPaymentStep.tsx and
// PostPaymentTimer.dc.html exactly (DECISIONS.md D-011/D-012): no extend
// button, just "I feel better now" / "Stop", both leading to the same
// reinforcement summary. Runs AFTER PaymentSuccessScreen's "Done".
export function PostPaymentStep({
  amount,
  newBalance,
  streakDays,
  cigarettesAvoided,
  onDone,
}: {
  amount: number;
  newBalance: number;
  streakDays: number;
  cigarettesAvoided: number;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("timer");
  const { secondsLeft, target } = useCountdown(45, () => setPhase("satisfaction"));

  return (
    <View style={{ flex: 1 }}>
      {phase === "timer" && (
        <View style={styles.center}>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.title}>Sit with it for a minute.</Text>
            <Text style={styles.subtitle}>The craving already got its win. Let&apos;s just wait it out.</Text>
          </View>
          <ProgressRing size={220} strokeWidth={14} percent={(secondsLeft / target) * 100} color={colors.reward600} trackColor="rgba(255,255,255,0.15)">
            <Text style={styles.ringNum}>{secondsLeft}</Text>
            <Text style={styles.ringLabel}>seconds left</Text>
          </ProgressRing>
          <View style={{ width: "100%", gap: 12 }}>
            <Button variant="reward" onPress={() => setPhase("satisfaction")}>
              I feel better now
            </Button>
            <Button variant="outline" onPress={() => setPhase("satisfaction")}>
              Stop
            </Button>
          </View>
        </View>
      )}

      {phase === "satisfaction" && (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>💪</Text>
          <Text style={styles.title}>You got through it.</Text>
          <Button variant="reward" onPress={() => setPhase("reinforcement")}>
            I did it
          </Button>
        </View>
      )}

      {phase === "reinforcement" && (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={styles.reinforcementTitle}>Craving handled.</Text>
          <Text style={styles.savedLine}>₹{amount} saved.</Text>
          <Text style={styles.subtitle}>Another cigarette avoided.</Text>
          <Text style={styles.subtitle}>
            Your streak continues — <Text style={{ fontWeight: "700", color: colors.ink900 }}>{streakDays} days</Text> smoke-free.
          </Text>
          <Text style={styles.subtitle}>
            Your Quit Wallet is now <Text style={{ fontWeight: "700", color: colors.reward600 }}>₹{newBalance}</Text>.
          </Text>
          <Text style={styles.finePrint}>
            {cigarettesAvoided} {cigarettesAvoided === 1 ? "cigarette" : "cigarettes"} avoided in total.
          </Text>
          <Button variant="redirect" onPress={onDone} style={{ marginTop: 24 }}>
            Done
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  title: { fontSize: 22, fontWeight: "600", color: colors.ink900, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.ink600, marginTop: 6, textAlign: "center" },
  ringNum: { fontSize: 48, fontWeight: "700", color: colors.reward600 },
  ringLabel: { fontSize: 12, color: colors.ink600, marginTop: 4 },
  reinforcementTitle: { fontSize: 24, fontWeight: "700", color: colors.ink900 },
  savedLine: { fontSize: 18, color: colors.reward600, fontWeight: "600" },
  finePrint: { fontSize: 12, color: colors.ink300, marginTop: 4 },
});
