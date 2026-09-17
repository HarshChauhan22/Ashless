import { Text, View } from "react-native";
import { ScreenShell, Button } from "../components/ui";
import { colors } from "../theme/tokens";

// Placeholder for screens not yet ported to the mobile app in this first
// slice (Distraction, Digital Smoking Room, Relapse Flow, Savings Goals,
// Track/Wallet/Profile tabs) — all fully built and verified in webapp/,
// next slice is porting them here screen-for-screen the same way
// Login/Home/CravingHub/Breathing were. Loosely typed (not tied to
// RootStackParamList) since it's reused across both the root stack and the
// bottom-tab navigator's own, separate param list.
export default function ComingSoonScreen({ route, navigation }: { route: { name: string }; navigation: { goBack: () => void } }) {
  return (
    <ScreenShell>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink900, textAlign: "center" }}>{route.name}</Text>
        <Text style={{ fontSize: 14, color: colors.ink600, textAlign: "center" }}>
          Built and working in the web prototype — not yet ported to the mobile app.
        </Text>
        <Button variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          Back
        </Button>
      </View>
    </ScreenShell>
  );
}
