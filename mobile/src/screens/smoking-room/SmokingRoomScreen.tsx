import { useEffect, useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ScreenShell } from "../../components/ui";
import { colors, radii } from "../../theme/tokens";
import { apiFetch, newIdempotencyKey } from "../../lib/api";
import type { SmokingProfileClient } from "./types";
import { EntryStep } from "./EntryStep";
import { BrandStep } from "./BrandStep";
import { QuantityStep } from "./QuantityStep";
import { AmountStep } from "./AmountStep";
import { PaymentMethodPicker, PaymentProcessing, PaymentSuccessScreen, PaymentFailedScreen } from "./PaymentSteps";
import { PostPaymentStep } from "./PostPaymentStep";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";

type Step = "loading" | "entry" | "brand" | "quantity" | "amount" | "handoff" | "processing" | "failed" | "success" | "post-payment";

interface PaymentCreateResponse {
  paymentId: string;
  amountPaise: string;
}
interface VerifyResponse {
  status: "succeeded" | "failed" | "pending";
  balancePaise?: string;
}
interface StreakData {
  streakDays: number;
  cigarettesAvoided: number;
}
interface WalletData {
  redirectedThisMonth: number;
}

// Digital Smoking Room — a full-screen takeover (no bottom nav) matching
// webapp/app/craving/smoking-room/page.tsx's orchestration exactly
// (DECISIONS.md D-011/D-012). BEHAVIORAL SIMULATION: no cigarette is
// bought, no tobacco seller is ever contacted.
export default function SmokingRoomScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "SmokingRoom">) {
  const { cravingSessionId } = route.params;

  const [step, setStep] = useState<Step>("loading");
  const [profiles, setProfiles] = useState<SmokingProfileClient[]>([]);
  const [profile, setProfile] = useState<SmokingProfileClient | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [failureReason, setFailureReason] = useState("Request timed out");
  const [resultBalance, setResultBalance] = useState(0);
  const [redirectedThisMonth, setRedirectedThisMonth] = useState(0);
  const [streak, setStreak] = useState<StreakData>({ streakDays: 0, cigarettesAvoided: 0 });

  useEffect(() => {
    apiFetch<SmokingProfileClient[]>("/smoking-profiles").then((res) => {
      if (res.ok) setProfiles(res.data);
      setStep("entry");
    });
  }, []);

  function onBrandSelect(p: SmokingProfileClient) {
    setProfile(p);
    setStep("quantity");
  }

  function onProfileCreated(p: SmokingProfileClient) {
    setProfiles((prev) => [...prev, p]);
    onBrandSelect(p);
  }

  function onQuantityContinue(q: number) {
    setQuantity(q);
    setStep("amount");
  }

  async function onSave() {
    if (!profile) return;
    setSaving(true);
    const res = await apiFetch<PaymentCreateResponse>("/payments", {
      method: "POST",
      body: { smokingProfileId: profile.id, quantity, cravingSessionId },
      idempotencyKey: newIdempotencyKey(),
    });
    setSaving(false);
    if (!res.ok) {
      setFailureReason(res.error.message);
      setStep("failed");
      return;
    }
    setPaymentId(res.data.paymentId);
    setAmount(Number(res.data.amountPaise));
    setStep("handoff");
  }

  function onPay() {
    if (!paymentId) return;
    setStep("processing");
    runVerification(paymentId);
  }

  async function runVerification(id: string) {
    const res = await apiFetch<VerifyResponse>(`/payments/${id}/verify`, { method: "POST" });
    if (!res.ok) {
      setFailureReason(res.error.message);
      setStep("failed");
      return;
    }
    if (res.data.status === "pending") {
      setFailureReason("We're still checking with your bank.");
      setStep("failed");
      return;
    }
    if (res.data.status === "failed") {
      setFailureReason("Request timed out");
      setStep("failed");
      return;
    }
    setResultBalance(Number(res.data.balancePaise ?? 0));
    const [streakRes, walletRes] = await Promise.all([apiFetch<StreakData>("/streak"), apiFetch<WalletData>("/wallet")]);
    if (streakRes.ok) setStreak(streakRes.data);
    if (walletRes.ok) setRedirectedThisMonth(walletRes.data.redirectedThisMonth);
    setStep("success");
  }

  function retry() {
    if (!paymentId) {
      onSave();
      return;
    }
    setStep("processing");
    runVerification(paymentId);
  }

  async function markResistedAnyway() {
    await apiFetch(`/craving-sessions/${cravingSessionId}`, { method: "PATCH", body: { outcome: "resisted", copingAction: "smoking_room" } });
    navigation.navigate("Tabs");
  }

  function exitSmokingRoom() {
    navigation.replace("CravingHub", { cravingSessionId });
  }

  const backStep: Partial<Record<Step, () => void>> = {
    entry: exitSmokingRoom,
    brand: exitSmokingRoom,
    quantity: () => setStep("brand"),
    amount: () => setStep("quantity"),
    handoff: exitSmokingRoom,
  };
  const backIcon: Partial<Record<Step, "x" | "chevron">> = { entry: "x", brand: "chevron", quantity: "chevron", amount: "chevron", handoff: "x" };

  const deepBg = step === "success" ? "#0E1712" : step === "processing" ? "#0C1613" : step === "failed" ? colors.surface100 : undefined;

  return (
    <ScreenShell deepBg={deepBg}>
      {backStep[step] && (
        <Pressable onPress={backStep[step]} style={styles.backButton}>
          {backIcon[step] === "x" ? (
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink900} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M18 6 6 18M6 6l12 12" />
            </Svg>
          ) : (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink900} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="m15 18-6-6 6-6" />
            </Svg>
          )}
        </Pressable>
      )}

      {step === "loading" && <Text style={{ color: colors.ink600 }}>Loading…</Text>}
      {step === "entry" && <EntryStep onContinue={() => setStep("brand")} />}
      {step === "brand" && <BrandStep profiles={profiles} onSelect={onBrandSelect} onProfileCreated={onProfileCreated} />}
      {step === "quantity" && profile && <QuantityStep profile={profile} onContinue={onQuantityContinue} />}
      {step === "amount" && profile && (
        <AmountStep profile={profile} quantity={quantity} onBack={() => setStep("quantity")} onSave={onSave} saving={saving} />
      )}
      {step === "handoff" && <PaymentMethodPicker amount={amount} onPay={onPay} />}
      {step === "processing" && <PaymentProcessing />}
      {step === "failed" && <PaymentFailedScreen reason={failureReason} onRetry={retry} onMarkResisted={markResistedAnyway} />}
      {step === "success" && (
        <PaymentSuccessScreen
          amount={amount}
          totalTrackedSavings={resultBalance}
          redirectedThisMonth={redirectedThisMonth}
          onDone={() => setStep("post-payment")}
        />
      )}
      {step === "post-payment" && (
        <PostPaymentStep
          amount={amount}
          newBalance={resultBalance}
          streakDays={streak.streakDays}
          cigarettesAvoided={streak.cigarettesAvoided}
          onDone={() => navigation.navigate("Tabs")}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginBottom: 16,
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line200,
    backgroundColor: colors.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
});
