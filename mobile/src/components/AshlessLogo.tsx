import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, G, Path } from "react-native-svg";
import { colors } from "../theme/tokens";

// Reproduces brand/assets/ashless-app-icon.svg exactly (same gradient
// stops, same broken-loop mark) via react-native-svg, since RN can't load
// an .svg file as an <Image> directly.
export function AshlessIcon({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <LinearGradient id="ashlessIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4B4640" />
          <Stop offset="55%" stopColor="#8A7A52" />
          <Stop offset="100%" stopColor="#E7B23D" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={240} height={240} rx={52} fill="url(#ashlessIconBg)" />
      <G transform="translate(120 120) scale(0.82) translate(-120 -120)" fill="none" stroke="#FFF9F0" strokeWidth={24} strokeLinecap="butt">
        <Path d="M 185.25 89.57  A 72 72 0 0 1 189.54 138.63" />
        <Path d="M 189.54 138.63 A 72 72 0 0 1 161.30 178.98" />
        <Path d="M 161.30 178.98 A 72 72 0 0 1 113.72 191.73" />
        <Path d="M 113.72 191.73 A 72 72 0 0 1 69.09 170.91" />
        <Path d="M 69.09 170.91  A 72 72 0 0 1 48.27 126.28" />
        <Path d="M 48.27 126.28  A 72 72 0 0 1 61.02 78.70" />
        <Path d="M 61.02 78.70   A 72 72 0 0 1 101.37 50.46" />
        <Path d="M 101.37 50.46  A 72 72 0 0 1 150.43 54.75" />
      </G>
    </Svg>
  );
}

// Echoes brand/assets/ashless-wordmark.svg's "ashless." wordmark (lowercase,
// bold, gold full-stop) in plain Text since that SVG uses a custom font not
// loaded here — same visual device (lowercase + gold dot), system font.
export function AshlessWordmark({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
      <Text style={{ fontSize: size, fontWeight: "700", color: colors.ink900, letterSpacing: -0.5 }}>ashless</Text>
      <Text style={{ fontSize: size, fontWeight: "700", color: colors.gold500 }}>.</Text>
    </View>
  );
}
