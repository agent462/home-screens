import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../theme";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const Tagline: React.FC = () => {
  const frame = useCurrentFrame();

  const line1Opacity = interpolate(frame, [5, 20], [0, 1], clamp);
  const line1Y = interpolate(frame, [5, 20], [30, 0], clamp);

  const line2Opacity = interpolate(frame, [18, 33], [0, 1], clamp);
  const line2Y = interpolate(frame, [18, 33], [30, 0], clamp);

  const line3Opacity = interpolate(frame, [31, 46], [0, 1], clamp);
  const line3Y = interpolate(frame, [31, 46], [30, 0], clamp);

  const exit = interpolate(frame, [70, 90], [1, 0], clamp);

  const lineStyle: React.CSSProperties = {
    fontFamily: theme.fonts.sans,
    fontSize: 52,
    fontWeight: 200,
    lineHeight: 1.6,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity: exit,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            ...lineStyle,
            color: theme.colors.text,
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
          }}
        >
          Your display.
        </div>
        <div
          style={{
            ...lineStyle,
            color: theme.colors.text,
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
          }}
        >
          Your data.
        </div>
        <div
          style={{
            ...lineStyle,
            color: theme.colors.cyan,
            fontWeight: 300,
            opacity: line3Opacity,
            transform: `translateY(${line3Y}px)`,
          }}
        >
          Your rules.
        </div>
      </div>
    </AbsoluteFill>
  );
};
