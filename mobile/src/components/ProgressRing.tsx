import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme/tokens";

// RN has no native conic-gradient, so this approximates the artifact's ring
// with an SVG stroke-based circular progress indicator instead — same
// visual intent (colored arc = progress/time remaining), different
// technique. See DECISIONS.md D-012.
export function ProgressRing({
  size,
  strokeWidth = 10,
  percent,
  color,
  trackColor = colors.surface100,
  centerBg = colors.surface0,
  children,
}: {
  size: number;
  strokeWidth?: number;
  percent: number;
  color: string;
  trackColor?: string;
  centerBg?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
          borderRadius: (size - strokeWidth * 2) / 2,
          backgroundColor: centerBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}
