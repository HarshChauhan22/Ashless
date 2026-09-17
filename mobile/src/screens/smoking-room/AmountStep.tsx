import { Text, View, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button } from "../../components/ui";
import { colors, radii } from "../../theme/tokens";
import type { SmokingProfileClient } from "./types";

// AmountConfirmation — "the pivot" per canvas.json's own annotation.
// Matches webapp/app/craving/smoking-room/AmountStep.tsx and
// AmountConfirmation.dc.html exactly (DECISIONS.md D-011/D-012).
export function AmountStep({
  profile,
  quantity,
  onBack,
  onSave,
  saving,
}: {
  profile: SmokingProfileClient;
  quantity: number;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const costPerStick = Number(profile.costPerStickPaise);
  const amount = quantity * costPerStick;

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <View style={styles.costCard}>
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "baseline", gap: 8 }}>
          <Text style={styles.costMath}>
            {quantity} × ₹{costPerStick} =
          </Text>
          <Text style={styles.costAmount}>₹{amount}</Text>
        </View>
        <Text style={styles.costSubtext}>That&apos;s what this craving would have cost you.</Text>
      </View>

      <View style={styles.connectorRow}>
        <View style={styles.connector}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.redirect600} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 5v14M18 13l-6 6-6-6" />
          </Svg>
        </View>
      </View>

      <View style={styles.redirectCard}>
        <Text style={styles.redirectTitle}>Redirect it instead?</Text>
        <View style={styles.redirectRow}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.redirect600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 3h9l3 3v15H6z" />
            <Path d="M9 8h6M9 12h6M9 16h3" />
          </Svg>
          <Text style={styles.redirectAmount}>₹{amount} → Quit Wallet</Text>
        </View>
        <Text style={styles.redirectSubtext}>Tracked as your savings — never to a cigarette seller.</Text>
      </View>

      <View style={{ marginTop: 24 }}>
        <Button variant="redirect" onPress={onSave} disabled={saving}>
          {saving ? "Starting…" : `Redirect ₹${amount} to Quit Wallet`}
        </Button>
        <Pressable onPress={onBack}>
          <Text style={styles.adjustLink}>Adjust quantity</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  costCard: { borderRadius: 16, backgroundColor: colors.craving100, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 26 },
  costMath: { fontSize: 20, fontWeight: "600", color: colors.ink600 },
  costAmount: { fontSize: 34, fontWeight: "700", color: colors.craving500 },
  costSubtext: { fontSize: 14, color: colors.ink600, textAlign: "center", marginTop: 10 },
  connectorRow: { alignItems: "center", marginTop: -14, zIndex: 2 },
  connector: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface0,
    borderWidth: 2,
    borderColor: colors.redirect100,
    alignItems: "center",
    justifyContent: "center",
  },
  redirectCard: { borderRadius: 16, backgroundColor: colors.redirect100, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 22 },
  redirectTitle: { fontSize: 22, fontWeight: "700", color: colors.redirect600, textAlign: "center", marginBottom: 14 },
  redirectRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.surface0, borderRadius: 12, padding: 14 },
  redirectAmount: { fontSize: 18, fontWeight: "700", color: colors.ink900 },
  redirectSubtext: { fontSize: 13, color: colors.ink600, textAlign: "center", marginTop: 12 },
  adjustLink: { textAlign: "center", fontSize: 14, fontWeight: "600", color: colors.redirect600, marginTop: 14 },
});
