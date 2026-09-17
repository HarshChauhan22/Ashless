import type { Config } from "tailwindcss";

// Tokens mirrored 1:1 from the original Claude Design canvas artifact (dark
// theme) per DECISIONS.md D-011 — do not invent new colors here; if a new
// token is needed, add it to design/design-system.md first, then here.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#F5F5F5", 600: "#8E8E93", 300: "#5F6368" },
        surface: { 0: "#151515", 50: "#050505", 100: "#1C1C1E" },
        line: { 200: "rgba(255,255,255,0.08)" },
        craving: { 500: "#F0834F", 100: "rgba(240,131,79,0.16)" },
        redirect: { 600: "#63C7B8", 100: "rgba(99,199,184,0.16)" },
        reward: { 600: "#3FAE7A", 100: "rgba(63,174,122,0.16)" },
        gold: { 500: "#F4C95D" },
        alert: { 600: "#E5534B", 100: "rgba(229,83,75,0.14)" },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "20px",
        pill: "999px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
