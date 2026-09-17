import { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button } from "../../components/ui";
import { colors, radii } from "../../theme/tokens";
import type { SmokingProfileClient } from "./types";

// Matches webapp/app/craving/smoking-room/QuantityStep.tsx and
// QuantitySelection.dc.html exactly (DECISIONS.md D-011/D-012).
export function QuantityStep({ profile, onContinue }: { profile: SmokingProfileClient; onContinue: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  const costPerStick = Number(profile.costPerStickPaise);

  return (
    <View style={styles.center}>
      <Text style={styles.title}>How many would you have had?</Text>

      <View style={styles.stepperRow}>
        <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.stepButton}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.ink600} strokeWidth={2.5} strokeLinecap="round">
            <Path d="M5 12h14" />
          </Svg>
        </Pressable>
        <Text style={styles.quantity}>{quantity}</Text>
        <Pressable onPress={() => setQuantity((q) => q + 1)} style={[styles.stepButton, { backgroundColor: colors.redirect600, borderWidth: 0 }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
            <Path d="M12 5v14M5 12h14" />
          </Svg>
        </Pressable>
      </View>

      <Text style={styles.estimate}>≈ ₹{quantity * costPerStick}</Text>

      <View style={{ width: "100%", marginTop: 48 }}>
        <Button variant="redirect" onPress={() => onContinue(quantity)}>
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink900, marginBottom: 48, textAlign: "center" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 28 },
  stepButton: { width: 56, height: 56, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, alignItems: "center", justifyContent: "center" },
  quantity: { fontSize: 56, fontWeight: "700", color: colors.ink900, minWidth: 64, textAlign: "center" },
  estimate: { fontSize: 20, fontWeight: "600", color: colors.redirect600, marginTop: 36 },
});
