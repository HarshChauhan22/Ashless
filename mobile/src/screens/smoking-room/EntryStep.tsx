import { Text, View, StyleSheet } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button } from "../../components/ui";
import { colors, radii } from "../../theme/tokens";

// Matches webapp/app/craving/smoking-room/EntryStep.tsx and
// SmokingRoomEntry.dc.html exactly (DECISIONS.md D-011/D-012).
export function EntryStep({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Svg width={56} height={56} viewBox="0 0 64 64" fill="none" stroke={colors.redirect600} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={6} y={28} width={20} height={10} rx={2} />
          <Path d="M26 33h6" />
          <Path d="M34 20c10 2 14 8 14 13s-4 5-4 9" strokeDasharray="3 4" />
          <Circle cx={48} cy={46} r={9} />
          <Path d="M48 42v8M44 46h8" />
        </Svg>
      </View>
      <Text style={styles.title}>This is your Digital Smoking Room.</Text>
      <Text style={styles.subtitle}>
        No cigarettes here. Just an honest look at what this craving would have cost you — and a chance to keep that money instead.
      </Text>
      <View style={{ width: "100%", marginTop: 32 }}>
        <Button variant="redirect" onPress={onContinue}>
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  iconCircle: { width: 120, height: 120, borderRadius: radii.pill, backgroundColor: colors.redirect100, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink900, textAlign: "center", lineHeight: 32 },
  subtitle: { fontSize: 16, color: colors.ink600, textAlign: "center", marginTop: 16, lineHeight: 22 },
});
