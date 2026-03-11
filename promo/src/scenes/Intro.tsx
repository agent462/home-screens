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

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo — tighter timing
  const logoScale = spring({
    frame: frame - 12,
    fps,
    config: { damping: 10, stiffness: 100, mass: 0.7 },
  });
  const logoOpacity = interpolate(frame, [12, 28], [0, 1], clamp);

  // "HOME"
  const homeOpacity = interpolate(frame, [35, 50], [0, 1], clamp);
  const homeY = interpolate(frame, [35, 50], [16, 0], clamp);

  // "SCREENS"
  const screensOpacity = interpolate(frame, [45, 60], [0, 1], clamp);
  const screensY = interpolate(frame, [45, 60], [16, 0], clamp);

  // Accent line
  const lineWidth =
    spring({
      frame: frame - 65,
      fps,
      config: { damping: 18, stiffness: 70 },
    }) * 120;

  // Glow
  const glowOpacity = interpolate(frame, [60, 85], [0, 0.6], clamp);

  // Exit — faster
  const exit = interpolate(frame, [100, 120], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity: exit,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.colors.cyanGlow} 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 48,
        }}
      >
        <Logo size={130} />
      </div>

      {/* HOME */}
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: theme.colors.cyan,
          textTransform: "uppercase",
          opacity: homeOpacity,
          transform: `translateY(${homeY}px)`,
        }}
      >
        Home
      </div>

      {/* SCREENS */}
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 52,
          fontWeight: 600,
          letterSpacing: "0.1em",
          color: theme.colors.text,
          textTransform: "uppercase",
          opacity: screensOpacity,
          transform: `translateY(${screensY}px)`,
          marginTop: 4,
        }}
      >
        Screens
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 1,
          backgroundColor: theme.colors.cyan,
          opacity: 0.4,
          marginTop: 32,
        }}
      />
    </AbsoluteFill>
  );
};
