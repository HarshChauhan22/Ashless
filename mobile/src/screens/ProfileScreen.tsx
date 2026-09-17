import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View, StyleSheet } from "react-native";
import { ScreenShell, Button, Card } from "../components/ui";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";
import { useSession } from "../store/session";

interface SmokingProfile {
  id: string;
  brandLabel: string;
  costPerStickPaise: string;
  isPrimary: boolean;
}

// Matches webapp/app/(tabs)/profile/page.tsx (DECISIONS.md D-011/D-012) —
// minus the Savings Destination section, since backend/ deliberately
// doesn't implement savings_destinations yet (D-012's stated scope
// boundary: no real payout leg, so no destination to register).
export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { phoneNumber, logout } = useSession();
  const [profiles, setProfiles] = useState<SmokingProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [notifPrefs, setNotifPrefs] = useState({ cravingReminders: true, streakNudges: true, paymentUpdates: true });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function refresh() {
    const res = await apiFetch<SmokingProfile[]>("/smoking-profiles");
    if (res.ok) setProfiles(res.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setPrimary(id: string) {
    await apiFetch(`/smoking-profiles/${id}`, { method: "PATCH", body: { isPrimary: true } });
    refresh();
  }

  async function saveEdit(id: string) {
    const price = Number(editPrice);
    if (!price || price <= 0) return;
    await apiFetch(`/smoking-profiles/${id}`, { method: "PATCH", body: { pricingMode: "single_stick", costPerStickPaise: price } });
    setEditingId(null);
    refresh();
  }

  async function deleteProfile(id: string) {
    setDeleteError(null);
    const res = await apiFetch(`/smoking-profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleteError(res.error.message);
      return;
    }
    refresh();
  }

  function doLogout() {
    logout();
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={{ gap: 24, paddingBottom: 24 }}>
        <View>
          <Text style={styles.phone}>{phoneNumber ?? "Profile"}</Text>
          <Text style={styles.memberSince}>Member here</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Smoking Profiles</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {profiles.map((p) => (
              <Card key={p.id}>
                {editingId === p.id ? (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.brandLabel}>{p.brandLabel}</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={editPrice}
                      onChangeText={(t) => setEditPrice(t.replace(/\D/g, ""))}
                      placeholder="New price per cigarette (₹)"
                      placeholderTextColor={colors.ink300}
                      style={styles.input}
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button variant="outline" style={{ flex: 1 }} onPress={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button variant="redirect" style={{ flex: 1 }} onPress={() => saveEdit(p.id)}>
                        Save
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.brandLabel}>{p.brandLabel}</Text>
                        {p.isPrimary && (
                          <View style={styles.usualBadge}>
                            <Text style={styles.usualBadgeText}>USUAL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.brandPrice}>₹{p.costPerStickPaise}/stick</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {!p.isPrimary && (
                        <Pressable onPress={() => setPrimary(p.id)}>
                          <Text style={[styles.actionText, { color: colors.redirect600 }]}>Set usual</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => {
                          setEditingId(p.id);
                          setEditPrice(p.costPerStickPaise);
                        }}
                      >
                        <Text style={[styles.actionText, { color: colors.ink600 }]}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteProfile(p.id)}>
                        <Text style={[styles.actionText, { color: colors.alert600 }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Card>
            ))}
            {profiles.length === 0 && (
              <Card>
                <Text style={styles.caption}>No profiles yet — set one up in the Smoking Room.</Text>
              </Card>
            )}
            {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card style={{ gap: 12, marginTop: 8 }}>
            {(
              [
                ["cravingReminders", "Craving check-in reminders"],
                ["streakNudges", "Streak & milestone nudges"],
                ["paymentUpdates", "Payment status updates"],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: colors.ink900 }}>{label}</Text>
                <Switch
                  value={notifPrefs[key]}
                  onValueChange={(v) => setNotifPrefs((p) => ({ ...p, [key]: v }))}
                  trackColor={{ true: colors.redirect600, false: colors.surface100 }}
                />
              </View>
            ))}
          </Card>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Account &amp; Privacy</Text>
          <Card style={{ gap: 10, marginTop: 8 }}>
            <Text style={{ fontSize: 14, color: colors.ink900 }}>Export my data</Text>
            <Text style={{ fontSize: 14, color: colors.alert600 }}>Delete account</Text>
          </Card>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Help &amp; Support</Text>
          <Card style={{ gap: 12, marginTop: 8 }}>
            <Pressable onPress={() => navigation.getParent()?.navigate("Coach")}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.redirect600 }}>Talk to AI Coach</Text>
            </Pressable>
            <View>
              <Text style={{ fontSize: 14, color: colors.ink900 }}>Need help? Contact support or find a helpline.</Text>
              <Text style={styles.caption}>iCall: 9152987821 · KIRAN: 1800-599-0019</Text>
            </View>
          </Card>
        </View>

        <Button variant="outline" onPress={doLogout}>
          Log out
        </Button>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  phone: { fontSize: 20, fontWeight: "700", color: colors.ink900 },
  memberSince: { fontSize: 14, color: colors.ink600, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.ink900 },
  brandLabel: { fontSize: 15, fontWeight: "600", color: colors.ink900 },
  brandPrice: { fontSize: 12, color: colors.ink600, marginTop: 2 },
  usualBadge: { borderRadius: radii.pill, backgroundColor: colors.redirect100, paddingHorizontal: 8, paddingVertical: 2 },
  usualBadgeText: { fontSize: 10, fontWeight: "700", color: colors.redirect600 },
  actionText: { fontSize: 12, fontWeight: "600" },
  input: { borderRadius: 10, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface100, paddingHorizontal: 12, paddingVertical: 8, color: colors.ink900, fontSize: 14 },
  caption: { fontSize: 12, color: colors.ink600 },
  errorText: { fontSize: 12, color: colors.alert600 },
});
