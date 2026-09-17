"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenShell } from "@/components/ui";
import { apiFetch, newIdempotencyKey, track } from "@/lib/api-client";
import type { SmokingProfileClient } from "./types";
import { EntryStep } from "./EntryStep";
import { BrandStep } from "./BrandStep";
import { QuantityStep } from "./QuantityStep";
import { AmountStep } from "./AmountStep";
import { PaymentMethodPicker, PaymentProcessing, PaymentSuccessScreen, PaymentFailedScreen } from "./PaymentSteps";
import { PostPaymentStep } from "./PostPaymentStep";

type Step = "loading" | "entry" | "brand" | "quantity" | "amount" | "handoff" | "processing" | "failed" | "success" | "post-payment";

interface PaymentCreateResponse {
  paymentId: string;
  status: string;
  amountPaise: number;
}
interface VerifyResponse {
  status: "succeeded" | "failed" | "pending";
  balancePaise?: number;
}
interface StreakData {
  streakDays: number;
  cigarettesAvoided: number;
}
interface WalletData {
  balancePaise: number;
  redirectedThisMonth: number;
}

// Digital Smoking Room — a full-screen takeover (no bottom nav) matching
// design/digital-smoking-room.md and, screen-for-screen, the artifact's
// SmokingRoomEntry -> BrandSelection -> QuantitySelection ->
// AmountConfirmation -> PaymentInitiation -> PaymentPending -> PaymentSuccess
// -> PostPaymentTimer chain (DECISIONS.md D-011). BEHAVIORAL SIMULATION: no
// cigarette is bought, no tobacco seller is ever contacted — the only
// real-world effect is a server-verified redirected payment into the user's
// own savings.
export default function SmokingRoomPage() {
  return (
    <Suspense>
      <SmokingRoomContent />
    </Suspense>
  );
}

function SmokingRoomContent() {
  const router = useRouter();
  const params = useSearchParams();
  const cravingSessionId = params.get("cravingSessionId") ?? "";

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
    track("smoking_room_opened", { cravingSessionId });
    (async () => {
      const res = await apiFetch<SmokingProfileClient[]>("/api/smoking-profiles");
      if (res.ok) setProfiles(res.data);
      setStep("entry");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onBrandSelect(p: SmokingProfileClient) {
    track("cigarette_selected", { cravingSessionId, profileId: p.id, selectionSource: p.isPrimary ? "usual" : "recent" });
    setProfile(p);
    setStep("quantity");
  }

  function onProfileCreated(p: SmokingProfileClient) {
    setProfiles((prev) => [...prev, p]);
    onBrandSelect(p);
  }

  function onQuantityContinue(q: number) {
    track("quantity_selected", { cravingSessionId, quantity: q, isSingleStick: q === 1 });
    setQuantity(q);
    setStep("amount");
  }

  async function onSave() {
    if (!profile) return;
    setSaving(true);
    const res = await apiFetch<PaymentCreateResponse>("/api/payments", {
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
    setAmount(res.data.amountPaise);
    setStep("handoff");
  }

  function onPay() {
    if (!paymentId) return;
    setStep("processing");
    runVerification(paymentId);
  }

  async function runVerification(id: string) {
    const res = await apiFetch<VerifyResponse>(`/api/payments/${id}/verify`, { method: "POST" });
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
    setResultBalance(res.data.balancePaise ?? 0);
    const [streakRes, walletRes] = await Promise.all([apiFetch<StreakData>("/api/streak"), apiFetch<WalletData>("/api/wallet")]);
    if (streakRes.ok) setStreak(streakRes.data);
    if (walletRes.ok) setRedirectedThisMonth(walletRes.data.redirectedThisMonth);
    setStep("success");
  }

  function retry() {
    // Per payment-flow.md SCR-20: "Try again" re-attempts with a FRESH
    // idempotency key. If payment creation itself never succeeded (no
    // paymentId yet), retry means re-running onSave() from scratch, not
    // re-verifying a payment that was never created.
    if (!paymentId) {
      onSave();
      return;
    }
    setStep("processing");
    runVerification(paymentId);
  }

  async function markResistedAnyway() {
    if (cravingSessionId) {
      await apiFetch(`/api/craving-sessions/${cravingSessionId}`, { method: "PATCH", body: { outcome: "resisted", copingAction: "smoking_room" } });
    }
    router.replace("/home");
  }

  function exitSmokingRoom() {
    router.replace(`/craving?cravingSessionId=${cravingSessionId}`);
  }

  const backStep: Partial<Record<Step, () => void>> = {
    entry: exitSmokingRoom,
    brand: exitSmokingRoom,
    quantity: () => setStep("brand"),
    amount: () => setStep("quantity"),
    handoff: exitSmokingRoom,
  };
  const backIcon: Partial<Record<Step, "x" | "chevron">> = { entry: "x", brand: "chevron", quantity: "chevron", amount: "chevron", handoff: "x" };

  const shellBg = step === "success" ? "reward-deep" : step === "processing" ? "redirect-deep" : step === "failed" ? "alert-surface" : "surface";

  return (
    <ScreenShell bg={shellBg}>
      {backStep[step] && (
        <button onClick={backStep[step]} className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-line-200 bg-surface-0">
          {backIcon[step] === "x" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          )}
        </button>
      )}

      {step === "loading" && <p className="text-ink-600">Loading…</p>}

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
          cravingSessionId={cravingSessionId}
          onDone={() => router.replace("/home")}
        />
      )}
    </ScreenShell>
  );
}
