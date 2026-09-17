// Mirrors webapp/tailwind.config.ts exactly, which itself mirrors the
// original Claude Design canvas artifact's dark theme (DECISIONS.md D-011).
// Single source of truth for both clients is the artifact; keep these two
// files in sync by hand until there's a shared design-tokens package.
export const colors = {
  ink900: "#F5F5F5",
  ink600: "#8E8E93",
  ink300: "#5F6368",
  line200: "rgba(255,255,255,0.08)",
  surface0: "#151515",
  surface50: "#050505",
  surface100: "#1C1C1E",
  craving500: "#F0834F",
  craving100: "rgba(240,131,79,0.16)",
  redirect600: "#63C7B8",
  redirect100: "rgba(99,199,184,0.16)",
  reward600: "#3FAE7A",
  reward100: "rgba(63,174,122,0.16)",
  gold500: "#F4C95D",
  alert600: "#E5534B",
  alert100: "rgba(229,83,75,0.14)",
  white: "#FFFFFF",
};

export const radii = { sm: 8, md: 12, lg: 20, pill: 999 };
