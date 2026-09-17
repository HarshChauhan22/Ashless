import { View, StyleSheet } from "react-native";
import { AshlessIcon, AshlessWordmark } from "../components/AshlessLogo";
import { colors } from "../theme/tokens";

// Intro/splash screen shown briefly on cold app open, before Login/Home —
// requested addition, App.tsx shows this for a fixed delay then proceeds
// to the normal auth-gated routing.
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <AshlessIcon size={72} />
      <View style={{ marginTop: 16 }}>
        <AshlessWordmark size={34} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface50, alignItems: "center", justifyContent: "center" },
});
