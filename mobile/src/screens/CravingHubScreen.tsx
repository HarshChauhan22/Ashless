import { useEffect } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { ScreenShell } from "../components/ui";
import { colors, radii } from "../theme/tokens";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

// Matches webapp/app/craving/page.tsx and, before that,
// CravingIntervention.dc.html exactly (DECISIONS.md D-011/D-012): no back
// affordance, three options, Digital Smoking Room visually primary.
export default function CravingHubScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "CravingHub">) {
  const { cravingSessionId } = route.params;

  useEffect(() => {
    // TODO: track("craving_intervention_opened", { cravingSessionId }) once analytics is wired up.
  }, [cravingSessionId]);

  return (
    <ScreenShell deepBg="#1A120D">
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>You&apos;re craving a cigarette. Let&apos;s ride it out for a second.</Text>
        <Text style={styles.subtitle}>Cravings usually peak and pass within a few minutes.</Text>

        <View style={{ marginTop: 32, gap: 14 }}>
          <Pressable onPress={() => navigation.navigate("Breathing", { cravingSessionId })} style={styles.optionCard}>
            <View style={styles.iconCircle}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.craving500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 2a10 10 0 1 0 0 20 6 6 0 0 0 0-12 3 3 0 0 1 0-6" />
              </Svg>
            </View>
            <View>
              <Text style={styles.optionTitle}>60-second breathing</Text>
              <Text style={styles.optionSubtitle}>A guided pacer to slow things down</Text>
            </View>
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Distraction", { cravingSessionId })} style={styles.optionCard}>
            <View style={styles.iconCircle}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.craving500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
              </Svg>
            </View>
            <View>
              <Text style={styles.optionTitle}>Quick distraction</Text>
              <Text style={styles.optionSubtitle}>A short prompt to shift your focus</Text>
            </View>
          </Pressable>

          <Pressable onPress={() => navigation.navigate("SmokingRoom", { cravingSessionId })} style={[styles.optionCard, { backgroundColor: colors.redirect600 }]}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={3} y={12} width={12} height={7} rx={2} />
                <Path d="M15 15h4" />
                <Path d="M18 8c6 1 8 5 8 8s-2 3-2 6" strokeDasharray="2 3" />
              </Svg>
            </View>
            <View>
              <Text style={[styles.optionTitle, { color: "#fff" }]}>Go to Digital Smoking Room</Text>
              <Text style={[styles.optionSubtitle, { color: "rgba(255,255,255,0.8)" }]}>Still craving? See what it would really cost.</Text>
            </View>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable onPress={() => navigation.navigate("Relapse", { cravingSessionId })} style={{ paddingBottom: 8 }}>
          <Text style={styles.relapseLink}>I already smoked</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "600", color: colors.ink900, lineHeight: 30, marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.ink600, marginTop: 10, lineHeight: 20 },
  optionCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: radii.md, backgroundColor: colors.surface0, padding: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.craving100, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: 16, fontWeight: "600", color: colors.ink900 },
  optionSubtitle: { fontSize: 13, color: colors.ink600, marginTop: 2 },
  relapseLink: { textAlign: "center", fontSize: 13, color: colors.ink600, textDecorationLine: "underline" },
});
