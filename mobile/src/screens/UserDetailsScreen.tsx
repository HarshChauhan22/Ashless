import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { ScreenShell, Button } from "../components/ui";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";
import { useSession } from "../store/session";

const GENDERS = ["Male", "Female", "Other"];

// Requested addition, 2026-09-16: a one-time User Details step shown right
// after login, before Home. Submitting it is also what makes the
// smoke-free tracker "start from Day 1" (see backend's
// AuthService.completeOnboarding, which sets onboardingCompletedAt — the
// anchor insights.service.ts's computeStreak now uses).
export default function UserDetailsScreen() {
  const completeOnboarding = useSession((s) => s.completeOnboarding);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = firstName.trim() && lastName.trim() && email.trim() && Number(age) > 0 && gender;

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await apiFetch("/auth/profile", {
      method: "PATCH",
      body: { firstName, lastName, email, age: Number(age), gender },
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    completeOnboarding();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScreenShell>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 24 }} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.title}>Tell us a bit about you.</Text>
            <Text style={styles.subtitle}>This helps us personalize your quit journey.</Text>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>First Name</Text>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder="e.g. Harsh" placeholderTextColor={colors.ink300} style={styles.input} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput value={lastName} onChangeText={setLastName} placeholder="e.g. Chauhan" placeholderTextColor={colors.ink300} style={styles.input} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Gmail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@gmail.com"
                placeholderTextColor={colors.ink300}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                value={age}
                onChangeText={(t) => setAge(t.replace(/\D/g, ""))}
                placeholder="e.g. 28"
                placeholderTextColor={colors.ink300}
                keyboardType="number-pad"
                maxLength={3}
                style={styles.input}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {GENDERS.map((g) => (
                  <Pressable key={g} onPress={() => setGender(g)} style={[styles.chip, gender === g && styles.chipActive]}>
                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          <Button variant="redirect" disabled={!valid || loading} onPress={submit}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </ScrollView>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: colors.ink900, lineHeight: 30 },
  subtitle: { fontSize: 14, color: colors.ink600, marginTop: 8 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink600 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line200,
    backgroundColor: colors.surface0,
    paddingHorizontal: 16,
    color: colors.ink900,
    fontSize: 16,
  },
  chip: { flex: 1, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, paddingVertical: 12, alignItems: "center" },
  chipActive: { borderColor: colors.redirect600, backgroundColor: colors.redirect100 },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.ink600 },
  chipTextActive: { color: colors.redirect600 },
  error: { color: colors.alert600, fontSize: 14 },
});
