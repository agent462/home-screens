import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../theme";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const FEATURES = [
  { title: "Open Source", subtitle: "Free forever. MIT licensed.", color: "#4ade80" },
  { title: "30 Modules", subtitle: "Weather, news, stocks, sports & more", color: theme.colors.cyan },
  { title: "Drag & Drop", subtitle: "Visual editor \u2014 no code needed", color: "#a78bfa" },
  { title: "Raspberry Pi", subtitle: "Runs on a cheap computer", color: "#f59e0b" },
  { title: "5 Weather Providers", subtitle: "OWM, WeatherAPI, Pirate, NOAA, Open-Meteo", color: "#60a5fa" },
  { title: "Remote Control", subtitle: "Phone, Home Assistant, scripts", color: "#f472b6" },
];

export const Features: React.FC = () => {
  const frame = useCurrentFrame();

  const exit = interpolate(frame, [210, 240], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        paddingLeft: 100,
        paddingRight: 100,
        opacity: exit,
      }}
    >
      {FEATURES.map((feature, i) => {
        const delay = 10 + i * 25;
        const opacity = interpolate(frame, [delay, delay + 18], [0, 1], clamp);
        const x = interpolate(frame, [delay, delay + 18], [24, 0], clamp);

        return (
          <div
            key={feature.title}
            style={{
              opacity,
              transform: `translateX(${x}px)`,
              marginBottom: 40,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Colored accent dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: feature.color,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontFamily: theme.fonts.sans,
                  fontSize: 34,
                  fontWeight: 500,
                  color: theme.colors.text,
                }}
              >
                {feature.title}
              </div>
            </div>
            <div
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: 20,
                fontWeight: 300,
                color: theme.colors.textMuted,
                marginTop: 8,
                marginLeft: 22,
              }}
            >
              {feature.subtitle}
            </div>
            {i < FEATURES.length - 1 && (
              <div
                style={{
                  width: 40,
                  height: 1,
                  backgroundColor: feature.color,
                  opacity: 0.2,
                  marginTop: 20,
                  marginLeft: 22,
                }}
              />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
