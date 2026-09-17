import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { ScreenShell, Button } from "../components/ui";
import { ProgressRing } from "../components/ProgressRing";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";
import { useCountdown } from "../lib/useCountdown";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type Phase = "running" | "complete";

// Matches webapp/app/craving/breathing/page.tsx and BreathingTimer.dc.html
// exactly (DECISIONS.md D-011/D-012): +15 sec (not +30), Stop is a filled
// dark button beside it, no back affordance while running.
export default function BreathingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Breathing">) {
  const { cravingSessionId } = route.params;
  const [phase, setPhase] = useState<Phase>("running");
  const { secondsLeft, target, extend } = useCountdown(60, () => setPhase("complete"));

  function handleStop() {
    navigation.replace("CravingHub", { cravingSessionId });
  }

  async function feelBetter() {
    await apiFetch(`/craving-sessions/${cravingSessionId}`, {
      method: "PATCH",
      body: { outcome: "resisted", copingAction: "breathing_exercise" },
    });
    navigation.navigate("Tabs");
  }

  return (
    <ScreenShell deepBg="#1A120D">
      {phase === "running" && (
        <View style={styles.center}>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.title}>Breathe in. Breathe out.</Text>
            <Text style={styles.subtitle}>Just ride it out for a minute.</Text>
          </View>
          <ProgressRing size={220} strokeWidth={14} percent={(secondsLeft / target) * 100} color={colors.craving500} trackColor="rgba(255,255,255,0.15)">
            <Text style={styles.ringNum}>{secondsLeft}</Text>
            <Text style={styles.ringLabel}>seconds left</Text>
          </ProgressRing>
          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <Button variant="outline" style={{ flex: 1 }} onPress={() => extend(15)}>
              +15 sec
            </Button>
            <Pressable onPress={handleStop} style={styles.stopButton}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === "complete" && (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🌿</Text>
          <Text style={[styles.title, { textAlign: "center" }]}>Nice. You gave the craving some time.</Text>
          <Text style={[styles.subtitle, { textAlign: "center" }]}>
            That doesn&apos;t mean it&apos;s gone for good — but you got through this moment without acting on it.
          </Text>
          <View style={{ width: "100%", gap: 12 }}>
            <Button variant="reward" onPress={feelBetter}>
              I feel better
            </Button>
            <Button variant="outline" onPress={() => navigation.replace("CravingHub", { cravingSessionId })}>
              Back to Craving Options
            </Button>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 32 },
  title: { fontSize: 20, fontWeight: "600", color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink600, marginTop: 6 },
  ringNum: { fontSize: 48, fontWeight: "700", color: colors.craving500 },
  ringLabel: { fontSize: 12, color: colors.ink600, marginTop: 4 },
  stopButton: { flex: 1, height: 56, borderRadius: radii.pill, backgroundColor: colors.ink900, alignItems: "center", justifyContent: "center" },
  stopButtonText: { color: colors.surface50, fontSize: 15, fontWeight: "600" },
});
