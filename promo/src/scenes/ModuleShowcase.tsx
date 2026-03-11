import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Sequence,
} from "remotion";
import { theme } from "../theme";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const FEATURED = [
  { name: "Clock", description: "Time, date & week number", glow: "rgba(103,232,249,0.12)" },
  { name: "Weather", description: "8 views \u2022 4 providers", glow: "rgba(96,165,250,0.12)" },
  { name: "Calendar", description: "Google Calendar sync", glow: "rgba(167,139,250,0.12)" },
  { name: "Stocks", description: "Live market data", glow: "rgba(74,222,128,0.12)" },
  { name: "News", description: "RSS feeds \u2022 4 layouts", glow: "rgba(251,191,36,0.10)" },
  { name: "Sports", description: "Live ESPN scores", glow: "rgba(244,114,182,0.12)" },
];

const ALL_MODULES = [
  "Clock", "Calendar", "Weather", "Countdown", "Dad Joke", "Text",
  "Image", "Quote", "Todo", "Sticky Note", "Greeting", "News",
  "Stocks", "Crypto", "Word of Day", "History", "Moon Phase", "Sunrise",
  "Photos", "QR Code", "Year Progress", "Traffic", "Sports", "Air Quality",
  "Todoist", "Rain Map", "Multi-Month", "Garbage Day", "Standings", "Affirmations",
];

/* ── Module visuals inside glass cards ── */

const ModuleVisual: React.FC<{ name: string }> = ({ name }) => {
  const f = theme.fonts.sans;

  switch (name) {
    case "Clock":
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: f, fontSize: 88, fontWeight: 200, color: theme.colors.text, letterSpacing: "-0.02em" }}>
            10:30
          </div>
          <div style={{ fontFamily: f, fontSize: 20, fontWeight: 300, color: theme.colors.cyan, marginTop: 8 }}>
            AM
          </div>
        </div>
      );
    case "Weather":
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: f, fontSize: 88, fontWeight: 200, color: theme.colors.text }}>72°</div>
          <div style={{ fontFamily: f, fontSize: 18, fontWeight: 300, color: theme.colors.textMuted, marginTop: 8 }}>
            Partly Cloudy
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 24 }}>
            {["1PM", "2PM", "3PM", "4PM", "5PM"].map((t, i) => (
              <div key={t} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: f, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
                  {[68, 71, 73, 72, 70][i]}°
                </div>
                <div style={{ fontFamily: f, fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "Calendar":
      return (
        <div>
          <div style={{ fontFamily: f, fontSize: 18, fontWeight: 500, color: theme.colors.cyan, letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center" }}>
            March
          </div>
          <div style={{ fontFamily: f, fontSize: 100, fontWeight: 100, color: theme.colors.text, lineHeight: 1, textAlign: "center", marginTop: 4 }}>
            11
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
            {[
              { event: "Team Standup", color: "#60a5fa" },
              { event: "Design Review", color: "#a78bfa" },
            ].map((ev) => (
              <div key={ev.event} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: ev.color }} />
                <div style={{ fontFamily: f, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{ev.event}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "Stocks":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { sym: "AAPL", price: "$182.50", change: "+2.4%", up: true },
            { sym: "GOOGL", price: "$141.20", change: "+1.1%", up: true },
            { sym: "TSLA", price: "$248.90", change: "-0.8%", up: false },
          ].map((stock) => (
            <div key={stock.sym} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 16px" }}>
              <span style={{ fontFamily: f, fontSize: 18, fontWeight: 500, color: "#fff" }}>{stock.sym}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: f, fontSize: 16, color: "#fff" }}>{stock.price}</div>
                <div style={{ fontFamily: f, fontSize: 13, color: stock.up ? "#4ade80" : "#ef4444" }}>{stock.change}</div>
              </div>
            </div>
          ))}
        </div>
      );
    case "News":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[320, 260, 300, 220, 280].map((w, i) => (
            <div
              key={i}
              style={{
                width: w,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === 0 ? theme.colors.cyan : theme.colors.text,
                opacity: i === 0 ? 0.6 : 0.08 + i * 0.02,
              }}
            />
          ))}
        </div>
      );
    case "Sports":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, fontFamily: f }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ef4444", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 80, fontWeight: 200, color: theme.colors.text }}>7</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 300, color: theme.colors.textSubtle }}>vs</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#3b82f6", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 80, fontWeight: 200, color: theme.colors.textMuted }}>3</div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

/* ── Glass card module slide ── */

const ModuleSlide: React.FC<{ module: (typeof FEATURED)[0] }> = ({ module }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const enter = interpolate(frame, [0, 12], [0, 1], clamp);
  const exit = interpolate(frame, [50, 65], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: Math.min(enter, exit),
      }}
    >
      {/* Colored glow behind card */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${module.glow} 0%, transparent 70%)`,
        }}
      />

      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        {/* Glass card */}
        <div
          style={{
            width: 680,
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: 24,
            padding: "52px 48px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <ModuleVisual name={module.name} />
        </div>

        {/* Label */}
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 30,
            fontWeight: 500,
            color: theme.colors.cyan,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginTop: 40,
          }}
        >
          {module.name}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 18,
            fontWeight: 300,
            color: theme.colors.textMuted,
            marginTop: 10,
          }}
        >
          {module.description}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── Main scene (420 frames / 14s) ── */

export const ModuleShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Counter (frames 0-50)
  const countValue = interpolate(frame, [8, 40], [0, 30], clamp);
  const counterEnter = interpolate(frame, [0, 12], [0, 1], clamp);
  const counterExit = interpolate(frame, [38, 50], [1, 0], clamp);
  const counterScale = spring({
    frame: frame - 3,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Phase 3: Grid (frames 355-420)
  const gridEnter = interpolate(frame, [355, 375], [0, 1], clamp);
  const gridExit = interpolate(frame, [400, 420], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* Phase 1: "30 Modules" counter */}
      {frame < 55 && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: counterEnter * counterExit,
          }}
        >
          <div style={{ transform: `scale(${counterScale})`, textAlign: "center" }}>
            <div
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: 180,
                fontWeight: 100,
                color: theme.colors.text,
                lineHeight: 1,
              }}
            >
              {Math.round(countValue)}
            </div>
            <div
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: 26,
                fontWeight: 300,
                color: theme.colors.textMuted,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                marginTop: 20,
              }}
            >
              Modules
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Phase 2: Individual modules in glass cards */}
      {FEATURED.map((mod, i) => (
        <Sequence key={mod.name} from={50 + i * 50} durationInFrames={65}>
          <ModuleSlide module={mod} />
        </Sequence>
      ))}

      {/* Phase 3: All 30 modules grid */}
      {frame >= 350 && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: gridEnter * gridExit,
            padding: 60,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "center",
              maxWidth: 960,
            }}
          >
            {ALL_MODULES.map((name, i) => {
              const itemDelay = 360 + i * 1.5;
              const itemOpacity = interpolate(
                frame,
                [itemDelay, itemDelay + 10],
                [0, 1],
                clamp,
              );
              return (
                <div
                  key={name}
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: 16,
                    fontWeight: 300,
                    color: theme.colors.textMuted,
                    padding: "8px 16px",
                    borderRadius: 8,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    opacity: itemOpacity,
                  }}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
