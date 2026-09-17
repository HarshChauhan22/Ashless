"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/store/session";

type Step = "phone" | "otp";

// NEW SCREEN 1 — Login. Uses the existing mock-auth architecture
// (lib/auth.ts + /api/auth/login) rather than a separate auth system, per
// the brief's "do not overbuild authentication yet."
export default function LoginPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = /^\d{10}$/.test(phoneNumber);

  async function sendOtp() {
    if (!phoneValid) return;
    setError(null);
    setStep("otp");
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ userId: string; phoneNumber: string }>("/api/auth/login", {
      method: "POST",
      body: { phoneNumber, otp },
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setSession(res.data.userId, res.data.phoneNumber);
    router.replace("/home");
  }

  return (
    <ScreenShell>
      <div className="flex flex-1 flex-col justify-center gap-8 px-1">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ashless-app-icon.svg" alt="Ashless" className="mb-6 h-14 w-14 rounded-2xl" />
          <h1 className="text-[26px] font-bold leading-tight text-ink-900">
            {step === "phone" ? "Welcome back." : "Check your phone."}
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-ink-600">
            {step === "phone" ? "Log in to keep your streak and savings going." : "Enter the code we sent you."}
          </p>
        </div>

        {step === "phone" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-600">Phone number</span>
              <div className="flex h-14 items-center gap-2.5 rounded-[14px] border border-line-200 bg-surface-0 px-4">
                <span className="text-base text-ink-600">+91</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit number"
                  className="w-full bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-300"
                />
              </div>
            </div>
            {error && <p className="text-sm text-alert-600">{error}</p>}
            <Button variant="redirect" disabled={!phoneValid} onClick={sendOtp}>
              Send OTP
            </Button>
            <p className="text-center text-[13px] text-ink-600">By continuing you agree to the Terms &amp; Privacy Policy.</p>
          </div>
        )}

        {step === "otp" && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-600">6-digit code</span>
              <input
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-[14px] border border-line-200 bg-surface-0 px-4 py-3.5 text-center text-2xl tracking-[0.5em] text-ink-900 outline-none"
              />
            </label>
            <p className="text-center text-xs text-ink-300">Prototype mode — the code is always 123456.</p>
            {error && <p className="text-sm text-alert-600">{error}</p>}
            <Button variant="redirect" disabled={otp.length !== 6 || loading} onClick={verifyOtp}>
              {loading ? "Verifying…" : "Continue"}
            </Button>
            <button className="text-sm text-ink-600" onClick={() => setStep("phone")}>
              ← Edit number
            </button>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
