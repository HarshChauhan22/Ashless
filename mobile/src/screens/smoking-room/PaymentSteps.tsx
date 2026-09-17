import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View, Pressable, StyleSheet } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button } from "../../components/ui";
import { colors, radii } from "../../theme/tokens";

const UPI_METHODS = [
  { id: "gpay", label: "Google Pay", bg: "rgba(91,141,239,0.16)", stroke: "#5B8DEF" },
  { id: "phonepe", label: "PhonePe", bg: "rgba(99,199,184,0.16)", stroke: colors.redirect600 },
  { id: "paytm", label: "Paytm", bg: "rgba(99,199,184,0.16)", stroke: colors.redirect600 },
] as const;

// PaymentInitiation — matches webapp's PaymentMethodPicker and
// PaymentInitiation.dc.html exactly (DECISIONS.md D-011/D-012): a real
// in-app UPI method picker. Still MockPaymentProvider underneath — the
// method choice is cosmetic, no real UPI integration exists.
export function PaymentMethodPicker({ amount, onPay }: { amount: number; onPay: () => void }) {
  const [method, setMethod] = useState<string | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
        <Text style={styles.amount}>₹{amount}</Text>
        <View style={styles.payingRow}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.redirect600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={9} />
            <Path d="M12 8v4l3 2" />
          </Svg>
          <Text style={styles.payingText}>Paying: Ashless</Text>
        </View>
        <Text style={styles.disclaimer}>A real payment · tracked as your savings — never to a cigarette seller</Text>
      </View>

      <View style={{ marginTop: 28, gap: 12 }}>
        <Text style={styles.sectionLabel}>CHOOSE A UPI METHOD</Text>
        {UPI_METHODS.map((m) => (
          <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[styles.methodRow, method === m.id && styles.methodRowActive]}>
            <View style={[styles.methodIcon, { backgroundColor: m.bg }]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={m.stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx={12} cy={12} r={9} />
              </Svg>
            </View>
            <Text style={styles.methodLabel}>{m.label}</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="m9 18 6-6-6-6" />
            </Svg>
          </Pressable>
        ))}
        <Pressable onPress={() => setMethod("manual")} style={[styles.methodRow, styles.methodRowDashed, method === "manual" && styles.methodRowActive]}>
          <View style={[styles.methodIcon, { backgroundColor: colors.surface100 }]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </Svg>
          </View>
          <Text style={[styles.methodLabel, { color: colors.ink600 }]}>Enter UPI ID manually</Text>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m9 18 6-6-6-6" />
          </Svg>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />
      <Button variant="redirect" onPress={onPay}>
        Pay ₹{amount}
      </Button>
    </View>
  );
}

// PaymentPending — matches PaymentPending.dc.html.
export function PaymentProcessing() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.center}>
      <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{ position: "absolute", transform: [{ rotate }] }}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx={60} cy={60} r={52} stroke="#BFE1E3" strokeWidth={6} fill="none" />
            <Circle cx={60} cy={60} r={52} stroke={colors.redirect600} strokeWidth={6} strokeLinecap="round" strokeDasharray="90 300" fill="none" />
          </Svg>
        </Animated.View>
        <View style={styles.processingBadge}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.redirect600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={3} y={7} width={18} height={13} rx={2} />
            <Path d="M3 10h18" />
            <Circle cx={16} cy={15} r={1.5} fill={colors.redirect600} stroke="none" />
          </Svg>
        </View>
      </View>
      <Text style={styles.processingTitle}>Confirming your payment…</Text>
      <Text style={styles.processingSubtitle}>This can take a few seconds. Don&apos;t close the app.</Text>
    </View>
  );
}

// PaymentSuccess — matches PaymentSuccess.dc.html. Screen 9; the "sit with
// it" countdown (PostPaymentStep) is screen 9a, following once Done is
// tapped — success plays before the calming timer, not after.
export function PaymentSuccessScreen({
  amount,
  totalTrackedSavings,
  redirectedThisMonth,
  onDone,
}: {
  amount: number;
  totalTrackedSavings: number;
  redirectedThisMonth: number;
  onDone: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.successBadge}>
        <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 6 9 17l-5-5" />
        </Svg>
      </View>
      <Text style={styles.successTitle}>₹{amount} just became tracked savings.</Text>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total tracked savings</Text>
        <Text style={styles.totalAmount}>₹{totalTrackedSavings}</Text>
      </View>
      <Text style={styles.monthText}>
        That&apos;s {redirectedThisMonth} {redirectedThisMonth === 1 ? "craving" : "cravings"} you&apos;ve redirected this month.
      </Text>
      <View style={{ flex: 1 }} />
      <Button variant="reward" onPress={onDone}>
        Done
      </Button>
    </View>
  );
}

// PaymentFailure — matches PaymentFailure.dc.html.
export function PaymentFailedScreen({ reason, onRetry, onMarkResisted }: { reason: string; onRetry: () => void; onMarkResisted: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.failBadge}>
        <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={colors.alert600} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 6 6 18M6 6l12 12" />
        </Svg>
      </View>
      <Text style={styles.successTitle}>Payment didn&apos;t go through.</Text>
      <Text style={styles.processingSubtitle}>{reason}</Text>
      <View style={{ flex: 1 }} />
      <View style={{ width: "100%", gap: 12 }}>
        <Button variant="redirect" onPress={onRetry}>
          Try again
        </Button>
        <Button variant="outline" onPress={onMarkResisted}>
          Mark as resisted anyway
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  amount: { fontSize: 40, fontWeight: "700", color: colors.ink900 },
  payingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  payingText: { fontSize: 14, color: colors.ink600 },
  disclaimer: { fontSize: 12, color: colors.ink300, marginTop: 4, textAlign: "center" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.ink600, letterSpacing: 0.3 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, padding: 16 },
  methodRowDashed: { borderStyle: "dashed" },
  methodRowActive: { borderColor: colors.redirect600 },
  methodIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  methodLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink900 },
  processingBadge: { width: 64, height: 64, borderRadius: radii.pill, backgroundColor: colors.surface0, alignItems: "center", justifyContent: "center" },
  processingTitle: { fontSize: 18, fontWeight: "600", color: colors.ink900, marginTop: 32 },
  processingSubtitle: { fontSize: 14, color: colors.ink600, marginTop: 8, textAlign: "center" },
  successBadge: { width: 96, height: 96, borderRadius: radii.pill, backgroundColor: colors.reward600, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontWeight: "700", color: colors.ink900, marginTop: 28, textAlign: "center" },
  totalCard: { borderRadius: 16, backgroundColor: colors.surface0, paddingHorizontal: 28, paddingVertical: 20, marginTop: 28, alignItems: "center" },
  totalLabel: { fontSize: 13, color: colors.ink600 },
  totalAmount: { fontSize: 38, fontWeight: "700", color: colors.reward600, marginTop: 4 },
  monthText: { fontSize: 15, color: colors.ink600, marginTop: 20, textAlign: "center" },
  failBadge: { width: 88, height: 88, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, alignItems: "center", justifyContent: "center" },
});
