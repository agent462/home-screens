import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { Logo } from "../components/Logo";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [10, 30], [0, 1], clamp);
  const logoScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const titleOpacity = interpolate(frame, [30, 50], [0, 1], clamp);
  const titleY = interpolate(frame, [30, 50], [15, 0], clamp);

  const lineWidth =
    spring({
      frame: frame - 55,
      fps,
      config: { damping: 20, stiffness: 60 },
    }) * 80;

  const urlOpacity = interpolate(frame, [60, 80], [0, 1], clamp);
  const taglineOpacity = interpolate(frame, [75, 95], [0, 1], clamp);

  const fadeOut = interpolate(frame, [180, 210], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.colors.cyanGlow} 0%, transparent 70%)`,
          opacity: 0.6,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        <Logo size={100} />
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: theme.colors.cyan,
            textTransform: "uppercase",
          }}
        >
          Home{" "}
        </span>
        <span
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: theme.colors.text,
          }}
        >
          Screens
        </span>
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 1,
          backgroundColor: theme.colors.cyan,
          opacity: 0.4,
          marginTop: 32,
          marginBottom: 32,
        }}
      />

      {/* GitHub link */}
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 22,
          fontWeight: 300,
          color: theme.colors.textMuted,
          opacity: urlOpacity,
          letterSpacing: "0.03em",
        }}
      >
        github.com/agent462/home-screens
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 18,
          fontWeight: 300,
          color: theme.colors.textSubtle,
          opacity: taglineOpacity,
          marginTop: 16,
        }}
      >
        Your smart display, your way
      </div>
    </AbsoluteFill>
  );
};
