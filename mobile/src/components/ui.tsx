import { ReactNode } from "react";
import { Pressable, PressableProps, StyleSheet, Text, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii } from "../theme/tokens";

type Variant = "craving" | "redirect" | "reward" | "outline" | "ghost";

const VARIANT_BG: Record<Variant, string | undefined> = {
  craving: colors.craving500,
  redirect: colors.redirect600,
  reward: colors.reward600,
  outline: "transparent",
  ghost: "transparent",
};
const VARIANT_TEXT: Record<Variant, string> = {
  craving: colors.white,
  redirect: colors.white,
  reward: colors.white,
  outline: colors.ink900,
  ghost: colors.redirect600,
};

export function Button({
  variant = "redirect",
  children,
  disabled,
  style,
  ...rest
}: { variant?: Variant; children: ReactNode; style?: ViewStyle } & Omit<PressableProps, "style">) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: VARIANT_BG[variant],
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: colors.line200,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.buttonText, { color: VARIANT_TEXT[variant] }]}>{children}</Text>
    </Pressable>
  );
}

export function Card({ children, tint, style }: { children: ReactNode; tint?: "craving" | "redirect" | "reward"; style?: ViewStyle }) {
  const bg = tint === "craving" ? colors.craving100 : tint === "redirect" ? colors.redirect100 : tint === "reward" ? colors.reward100 : colors.surface0;
  return <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
}

export function ScreenShell({ children, deepBg, style }: { children: ReactNode; deepBg?: string; style?: ViewStyle }) {
  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: deepBg ?? colors.surface50 }, style]} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line200,
    padding: 16,
  },
  shell: { flex: 1, paddingHorizontal: 20, paddingVertical: 20 },
});
