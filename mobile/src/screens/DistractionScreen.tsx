import { useState } from "react";
import { Pressable, Text, View, ScrollView, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ScreenShell } from "../components/ui";
import { colors } from "../theme/tokens";
import { JOKES } from "../lib/jokes";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

// Matches webapp/app/craving/distraction/page.tsx and QuickDistraction.dc.html
// exactly (DECISIONS.md D-011/D-012): a scrollable list of joke cards, tap
// to expand the punchline in place.
export default function DistractionScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Distraction">) {
  const { cravingSessionId } = route.params;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ScreenShell>
      <Text style={styles.title}>Give your mind a break.</Text>
      <Text style={styles.subtitle}>Tap a joke to read it.</Text>

      <ScrollView style={{ flex: 1, marginTop: 24 }} contentContainerStyle={{ gap: 12 }}>
        {JOKES.map((joke, i) => {
          const open = openIndex === i;
          return (
            <Pressable key={i} onPress={() => setOpenIndex(open ? null : i)} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.setup}>{joke.setup}</Text>
                <Svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={open ? colors.craving500 : colors.ink600}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                >
                  <Path d={open ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
                </Svg>
              </View>
              {open && <Text style={styles.punchline}>{joke.punchline}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable onPress={() => navigation.replace("CravingHub", { cravingSessionId })} style={{ paddingTop: 16, paddingBottom: 8 }}>
        <Text style={styles.backLink}>Feeling better? Go back</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink600, marginTop: 6 },
  card: { borderRadius: 12, backgroundColor: colors.surface0, padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  setup: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink900 },
  punchline: { fontSize: 14, color: colors.ink600, marginTop: 8, lineHeight: 20 },
  backLink: { textAlign: "center", fontSize: 13, color: colors.ink600, textDecorationLine: "underline" },
});
