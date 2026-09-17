import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { ScreenShell, Button } from "../components/ui";
import { AshlessIcon, AshlessWordmark } from "../components/AshlessLogo";
import { colors } from "../theme/tokens";
import { apiFetch } from "../lib/api";
import { useSession } from "../store/session";

type Step = "phone" | "otp";

// Matches webapp/app/login/page.tsx and, before that, Login.dc.html exactly
// (DECISIONS.md D-011/D-012) — same copy, same mock-OTP flow, now hitting
// the real backend's POST /auth/login instead of an in-memory store.
// KeyboardAvoidingView + ScrollView wrap the form so the "Send OTP"/
// "Continue" button stays reachable when the keyboard is open (fix
// requested 2026-09-16 — the button was previously hidden behind the
// keyboard on the phone-number step).
export default function LoginScreen() {
  const setSession = useSession((s) => s.setSession);
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = /^\d{10}$/.test(phoneNumber);

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ userId: string; phoneNumber: string; accessToken: string; onboardingComplete: boolean }>("/auth/login", {
      method: "POST",
      body: { phoneNumber, otp },
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setSession(res.data.userId, res.data.phoneNumber, res.data.accessToken, res.data.onboardingComplete);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScreenShell>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 32 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center" }}>
            <AshlessIcon size={56} />
            <View style={{ marginTop: 14 }}>
              <AshlessWordmark size={24} />
            </View>
          </View>

          <View>
            <Text style={styles.title}>{step === "phone" ? "Welcome back." : "Check your phone."}</Text>
            <Text style={styles.subtitle}>
              {step === "phone" ? "Log in to keep your streak and savings going." : "Enter the code we sent you."}
            </Text>
          </View>

          {step === "phone" && (
            <View style={{ gap: 16 }}>
              <Text style={styles.label}>Phone number</Text>
              <View style={styles.field}>
                <Text style={{ color: colors.ink600, fontSize: 16 }}>+91</Text>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={(t) => setPhoneNumber(t.replace(/\D/g, ""))}
                  placeholder="10-digit number"
                  placeholderTextColor={colors.ink300}
                  style={styles.input}
                />
              </View>
              {error && <Text style={styles.error}>{error}</Text>}
              <Button variant="redirect" disabled={!phoneValid} onPress={() => setStep("otp")}>
                Send OTP
              </Button>
              <Text style={styles.terms}>By continuing you agree to the Terms & Privacy Policy.</Text>
            </View>
          )}

          {step === "otp" && (
            <View style={{ gap: 16 }}>
              <Text style={styles.label}>6-digit code</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, ""))}
                placeholder="123456"
                placeholderTextColor={colors.ink300}
                style={[styles.field, { color: colors.ink900, fontSize: 22, letterSpacing: 8, textAlign: "center" }]}
              />
              <Text style={styles.hint}>Prototype mode — the code is always 123456.</Text>
              {error && <Text style={styles.error}>{error}</Text>}
              <Button variant="redirect" disabled={otp.length !== 6 || loading} onPress={verifyOtp}>
                {loading ? "Verifying…" : "Continue"}
              </Button>
            </View>
          )}
        </ScrollView>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "700", color: colors.ink900, lineHeight: 32, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.ink600, marginTop: 8, lineHeight: 20, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink600 },
  field: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line200,
    backgroundColor: colors.surface0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  input: { flex: 1, color: colors.ink900, fontSize: 16 },
  error: { color: colors.alert600, fontSize: 14 },
  hint: { color: colors.ink300, fontSize: 12, textAlign: "center" },
  terms: { color: colors.ink600, fontSize: 13, textAlign: "center" },
});
