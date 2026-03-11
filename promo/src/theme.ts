import { loadFont } from "@remotion/google-fonts/Inter";

const inter = loadFont();

export const theme = {
  colors: {
    bg: "#0a0a0a",
    surface: "#141414",
    text: "#fafafa",
    textMuted: "rgba(255, 255, 255, 0.5)",
    textSubtle: "rgba(255, 255, 255, 0.25)",
    cyan: "#67E8F9",
    cyanLight: "#A5F3FC",
    cyanGlow: "rgba(103, 232, 249, 0.12)",
  },
  fonts: {
    sans: inter.fontFamily,
  },
};
