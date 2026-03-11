import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const SCALE = 0.6;
const s = (v: number) => v * SCALE;
const font = "Inter, system-ui, sans-serif";

/* ── Shared text style helper ── */
const tx = (
  size: number,
  color: string,
  weight = 300,
  extra?: React.CSSProperties,
): React.CSSProperties => ({
  fontFamily: font,
  fontSize: s(size),
  fontWeight: weight,
  color,
  lineHeight: 1.3,
  ...extra,
});

/* ── 12-module layout on 1080×1920 canvas ── */
const DISPLAY_MODULES = [
  // Row 1
  { label: "Clock", x: 20, y: 20, w: 660, h: 200 },
  { label: "Weather", x: 700, y: 20, w: 360, h: 200 },
  // Row 2
  { label: "Calendar", x: 20, y: 240, w: 510, h: 340 },
  { label: "Stocks", x: 550, y: 240, w: 510, h: 340 },
  // Row 3
  { label: "Sports", x: 20, y: 600, w: 340, h: 260 },
  { label: "AirQuality", x: 380, y: 600, w: 340, h: 260 },
  { label: "Crypto", x: 740, y: 600, w: 320, h: 260 },
  // Row 4
  { label: "News", x: 20, y: 880, w: 1040, h: 340 },
  // Row 5
  { label: "Todoist", x: 20, y: 1240, w: 510, h: 280 },
  { label: "DadJoke", x: 550, y: 1240, w: 510, h: 280 },
  // Row 6
  { label: "Traffic", x: 20, y: 1540, w: 510, h: 360 },
  { label: "GarbageDay", x: 550, y: 1540, w: 510, h: 360 },
];

/* ── Module content renderers ── */

const ModuleContent: React.FC<{ label: string }> = ({ label }) => {
  switch (label) {
    case "Clock":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <div style={tx(60, "#fff", 300, { letterSpacing: "-0.02em" })}>
            10:30
          </div>
          <div style={tx(17, "rgba(255,255,255,0.55)")}>
            Tuesday, March 11, 2026
          </div>
          <div style={tx(12, "rgba(255,255,255,0.3)", 300, { marginTop: s(4) })}>
            Week 11 &middot; Day 70
          </div>
        </div>
      );

    case "Weather":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            padding: s(16),
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: s(6) }}>
            <span style={tx(48, "#fff", 200)}>72°</span>
            <span style={tx(14, "rgba(255,255,255,0.5)")}>F</span>
          </div>
          <div style={tx(13, "rgba(255,255,255,0.55)", 300, { marginTop: s(2) })}>
            Partly Cloudy
          </div>
          <div
            style={{
              display: "flex",
              gap: s(8),
              marginTop: s(14),
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: s(10),
            }}
          >
            {[
              { t: "1PM", v: "68°" },
              { t: "2PM", v: "71°" },
              { t: "3PM", v: "73°" },
              { t: "4PM", v: "72°" },
              { t: "5PM", v: "70°" },
              { t: "6PM", v: "67°" },
            ].map((h) => (
              <div key={h.t} style={{ textAlign: "center", flex: 1 }}>
                <div style={tx(11, "rgba(255,255,255,0.4)")}>{h.v}</div>
                <div style={tx(8, "rgba(255,255,255,0.25)", 300, { marginTop: s(2) })}>
                  {h.t}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "Calendar":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(7),
            padding: s(14),
          }}
        >
          <div style={tx(12, "rgba(255,255,255,0.45)", 400)}>
            Today &middot; Tuesday
          </div>
          {[
            { time: "9:00 AM", event: "Team Standup", color: "#60a5fa", dur: "30m" },
            { time: "10:30 AM", event: "Product Review", color: "#a78bfa", dur: "1h" },
            { time: "12:00 PM", event: "Lunch", color: "#4ade80", dur: "1h" },
            { time: "1:30 PM", event: "Design Sprint", color: "#f59e0b", dur: "2h" },
            { time: "3:30 PM", event: "Code Review", color: "#f472b6", dur: "45m" },
            { time: "5:00 PM", event: "1:1 with Manager", color: "#06b6d4", dur: "30m" },
          ].map((ev) => (
            <div
              key={ev.event}
              style={{ display: "flex", alignItems: "center", gap: s(8) }}
            >
              <div
                style={{
                  width: s(3),
                  height: s(22),
                  borderRadius: s(2),
                  backgroundColor: ev.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={tx(12, "#fff", 400)}>{ev.event}</div>
                <div style={tx(9, "rgba(255,255,255,0.35)")}>
                  {ev.time} &middot; {ev.dur}
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case "Stocks":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(7),
            padding: s(12),
          }}
        >
          <div style={tx(11, "rgba(255,255,255,0.4)", 400, { letterSpacing: "0.08em", textTransform: "uppercase" })}>
            Market
          </div>
          {[
            { sym: "AAPL", price: "$182.50", change: "+2.41%", up: true },
            { sym: "GOOGL", price: "$141.20", change: "+1.12%", up: true },
            { sym: "TSLA", price: "$248.90", change: "-0.84%", up: false },
            { sym: "MSFT", price: "$412.35", change: "+0.67%", up: true },
            { sym: "AMZN", price: "$178.22", change: "-1.20%", up: false },
          ].map((stock) => (
            <div
              key={stock.sym}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: s(6),
                padding: `${s(6)}px ${s(10)}px`,
              }}
            >
              <span style={tx(13, "#fff", 500)}>{stock.sym}</span>
              <div style={{ textAlign: "right", display: "flex", gap: s(10), alignItems: "center" }}>
                <span style={tx(11, "rgba(255,255,255,0.5)")}>{stock.price}</span>
                <span style={tx(11, stock.up ? "#4ade80" : "#ef4444", 500, { minWidth: s(50), textAlign: "right" })}>
                  {stock.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      );

    case "Sports":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: s(8),
            padding: s(12),
          }}
        >
          <div style={tx(9, "rgba(255,255,255,0.35)", 400, { letterSpacing: "0.12em", textTransform: "uppercase" })}>
            MLB &middot; Final
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: s(20), marginTop: s(4) }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: s(10),
                  height: s(10),
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  margin: `0 auto ${s(6)}px`,
                }}
              />
              <div style={tx(11, "rgba(255,255,255,0.6)", 500)}>LAA</div>
              <div style={tx(36, "#fff", 200)}>7</div>
            </div>
            <div style={tx(14, "rgba(255,255,255,0.2)")}>vs</div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: s(10),
                  height: s(10),
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
                  margin: `0 auto ${s(6)}px`,
                }}
              />
              <div style={tx(11, "rgba(255,255,255,0.6)", 500)}>NYY</div>
              <div style={tx(36, "rgba(255,255,255,0.5)", 200)}>3</div>
            </div>
          </div>
          <div style={tx(9, "rgba(255,255,255,0.25)", 300, { marginTop: s(4) })}>
            Angel Stadium
          </div>
        </div>
      );

    case "AirQuality":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            gap: s(10),
            padding: s(14),
          }}
        >
          {/* AQI Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
            <span
              style={{
                ...tx(11, "#fff", 700),
                backgroundColor: "#16a34a",
                borderRadius: s(20),
                padding: `${s(3)}px ${s(10)}px`,
              }}
            >
              AQI 1
            </span>
            <span style={tx(12, "rgba(255,255,255,0.7)")}>Good</span>
          </div>
          {/* UV */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={tx(11, "rgba(255,255,255,0.5)")}>UV Index</span>
            <div style={{ display: "flex", alignItems: "center", gap: s(6) }}>
              <span style={tx(13, "#4ade80", 500)}>3</span>
              <span style={tx(10, "#4ade80")}>Moderate</span>
            </div>
          </div>
          {/* Pollutants */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: s(8),
              display: "flex",
              flexDirection: "column",
              gap: s(6),
            }}
          >
            {[
              { label: "PM2.5", value: "12", unit: "\u00b5g/m\u00b3" },
              { label: "PM10", value: "24", unit: "\u00b5g/m\u00b3" },
              { label: "O\u2083", value: "38", unit: "\u00b5g/m\u00b3" },
            ].map((p) => (
              <div
                key={p.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={tx(10, "rgba(255,255,255,0.4)")}>{p.label}</span>
                <span style={tx(10, "rgba(255,255,255,0.6)")}>
                  {p.value}{" "}
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>
                    {p.unit}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case "Crypto":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(7),
            padding: s(12),
            justifyContent: "center",
            height: "100%",
          }}
        >
          <div style={tx(11, "rgba(255,255,255,0.4)", 400, { letterSpacing: "0.08em", textTransform: "uppercase" })}>
            Crypto
          </div>
          {[
            { sym: "BTC", price: "$67,420", change: "+3.2%", up: true },
            { sym: "ETH", price: "$3,180", change: "+1.8%", up: true },
            { sym: "SOL", price: "$142.50", change: "-2.1%", up: false },
          ].map((coin) => (
            <div
              key={coin.sym}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: s(6),
                padding: `${s(7)}px ${s(10)}px`,
              }}
            >
              <span style={tx(13, "#fff", 500)}>{coin.sym}</span>
              <div style={{ textAlign: "right" }}>
                <div style={tx(11, "rgba(255,255,255,0.5)")}>{coin.price}</div>
                <div style={tx(10, coin.up ? "#4ade80" : "#ef4444", 500)}>
                  {coin.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case "News":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(9),
            padding: s(14),
          }}
        >
          <div style={tx(11, theme.colors.cyan, 500, { letterSpacing: "0.12em", textTransform: "uppercase" })}>
            News
          </div>
          {[
            { headline: "SpaceX Successfully Launches Starship on Orbital Test Flight", time: "12m" },
            { headline: "Federal Reserve Signals Interest Rate Cut Amid Economic Growth", time: "1h" },
            { headline: "Apple Unveils New AI-Powered Features at Developer Conference", time: "2h" },
            { headline: "Scientists Discover New Species in Deep Ocean Expedition", time: "3h" },
            { headline: "Global Climate Summit Reaches Landmark Agreement on Emissions", time: "5h" },
            { headline: "Tesla Opens New Gigafactory in Southeast Asia", time: "6h" },
          ].map((item, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: s(8), alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: s(4),
                  height: s(4),
                  borderRadius: "50%",
                  backgroundColor:
                    i === 0 ? theme.colors.cyan : "rgba(255,255,255,0.2)",
                  marginTop: s(4),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: s(8) }}>
                <span
                  style={tx(
                    11,
                    i === 0
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.45)",
                  )}
                >
                  {item.headline}
                </span>
                <span
                  style={tx(9, "rgba(255,255,255,0.25)", 300, { flexShrink: 0 })}
                >
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      );

    case "Todoist":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(8),
            padding: s(14),
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={tx(12, "rgba(255,255,255,0.5)", 400, { letterSpacing: "0.08em", textTransform: "uppercase" })}>
              Tasks
            </span>
            <span
              style={{
                ...tx(9, "rgba(255,255,255,0.6)", 600),
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: s(10),
                padding: `${s(2)}px ${s(8)}px`,
              }}
            >
              5
            </span>
          </div>
          {[
            { task: "Review pull requests", done: true, priority: "#246fe0" },
            { task: "Update API documentation", done: true, priority: "transparent" },
            { task: "Deploy staging build", done: false, priority: "#d1453b" },
            { task: "Write unit tests for auth", done: false, priority: "#eb8909" },
            { task: "Fix responsive layout bug", done: false, priority: "#246fe0" },
          ].map((t) => (
            <div
              key={t.task}
              style={{ display: "flex", alignItems: "center", gap: s(8) }}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: s(14),
                  height: s(14),
                  borderRadius: s(3),
                  border: t.done
                    ? "none"
                    : `1.5px solid ${t.priority === "transparent" ? "rgba(255,255,255,0.25)" : t.priority}`,
                  backgroundColor: t.done
                    ? "rgba(255,255,255,0.15)"
                    : "transparent",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.done && (
                  <svg width={s(8)} height={s(8)} viewBox="0 0 10 10">
                    <path
                      d="M2 5L4.5 7.5L8 3"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
              <span
                style={tx(
                  11,
                  t.done
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.8)",
                  300,
                  t.done
                    ? { textDecoration: "line-through" }
                    : undefined,
                )}
              >
                {t.task}
              </span>
            </div>
          ))}
        </div>
      );

    case "DadJoke":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            padding: s(18),
            gap: s(14),
          }}
        >
          <div style={tx(11, "rgba(255,255,255,0.35)", 400, { letterSpacing: "0.1em", textTransform: "uppercase" })}>
            Dad Joke
          </div>
          <div style={tx(14, "rgba(255,255,255,0.8)", 300, { lineHeight: 1.5 })}>
            Why do programmers prefer dark mode?
          </div>
          <div style={tx(14, theme.colors.cyan, 400, { lineHeight: 1.5 })}>
            Because light attracts bugs.
          </div>
        </div>
      );

    case "Traffic":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(8),
            padding: s(14),
          }}
        >
          <div style={tx(11, "rgba(255,255,255,0.4)", 400, { letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" })}>
            Traffic
          </div>
          {[
            { label: "Home \u2192 Office", time: "24 min", delay: 0, color: "#22c55e" },
            { label: "Home \u2192 School", time: "18 min", delay: 5, color: "#eab308" },
            { label: "Home \u2192 Downtown", time: "35 min", delay: 12, color: "#ef4444" },
            { label: "Home \u2192 Airport", time: "42 min", delay: 8, color: "#eab308" },
          ].map((route) => (
            <div
              key={route.label}
              style={{ display: "flex", alignItems: "center", gap: s(8) }}
            >
              <div
                style={{
                  width: s(7),
                  height: s(7),
                  borderRadius: "50%",
                  backgroundColor: route.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={tx(12, "#fff", 400)}>{route.label}</div>
                <div style={tx(9, "rgba(255,255,255,0.4)")}>
                  {route.time}
                  {route.delay > 0 && (
                    <span style={{ color: route.color }}>
                      {" "}
                      (+{route.delay} min)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case "GarbageDay":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(8),
            padding: s(14),
          }}
        >
          <div style={tx(11, "rgba(255,255,255,0.4)", 400, { letterSpacing: "0.08em", textTransform: "uppercase" })}>
            Collection
          </div>
          {[
            {
              type: "Trash",
              day: "Thursday",
              color: "#6ee7b7",
              active: false,
              note: "In 2 days",
            },
            {
              type: "Recycling",
              day: "Thursday",
              color: "#93c5fd",
              active: false,
              note: "In 2 days",
            },
            {
              type: "Compost",
              day: "Tuesday",
              color: "#fbbf24",
              active: true,
              note: "Today",
            },
          ].map((item) => (
            <div
              key={item.type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: s(10),
                backgroundColor: item.active
                  ? "rgba(255,255,255,0.06)"
                  : "transparent",
                borderRadius: s(6),
                padding: `${s(7)}px ${s(8)}px`,
                border: item.active
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid transparent",
              }}
            >
              {/* Bin icon */}
              <svg
                width={s(20)}
                height={s(20)}
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="5"
                  y="7"
                  width="14"
                  height="14"
                  rx="2"
                  stroke={item.color}
                  strokeWidth="1.5"
                  opacity={item.active ? 1 : 0.5}
                />
                <path
                  d="M3 7h18M10 4h4"
                  stroke={item.color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity={item.active ? 1 : 0.5}
                />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={tx(12, "#fff", 400)}>{item.type}</div>
                <div style={tx(9, "rgba(255,255,255,0.35)")}>{item.day}</div>
              </div>
              {item.active ? (
                <span
                  style={{
                    ...tx(8, "#fff", 600),
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderRadius: s(10),
                    padding: `${s(2)}px ${s(8)}px`,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.note}
                </span>
              ) : (
                <span style={tx(9, "rgba(255,255,255,0.3)")}>{item.note}</span>
              )}
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
};

/* ── Display Hero Scene (270 frames / 9s) ── */

export const DisplayHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const displayW = 1080 * SCALE;
  const displayH = 1920 * SCALE;

  // Display entrance
  const displayScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 50, mass: 1.5 },
  });
  const displayOpacity = interpolate(frame, [5, 30], [0, 1], clamp);

  // Exit
  const exit = interpolate(frame, [245, 270], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity: exit,
      }}
    >
      {/* Ambient glow behind display */}
      <div
        style={{
          position: "absolute",
          width: displayW + 200,
          height: displayH + 200,
          borderRadius: 100,
          background: `radial-gradient(ellipse, ${theme.colors.cyanGlow} 0%, transparent 60%)`,
          opacity: interpolate(frame, [60, 130], [0, 0.4], clamp),
        }}
      />

      {/* Display mockup */}
      <div
        style={{
          opacity: displayOpacity,
          transform: `scale(${displayScale})`,
        }}
      >
        <div
          style={{
            width: displayW,
            height: displayH,
            borderRadius: 16,
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#050510",
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* Background gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: interpolate(frame, [15, 40], [0, 1], clamp),
              background: [
                "radial-gradient(circle at 25% 10%, rgba(59,130,246,0.14) 0%, transparent 45%)",
                "radial-gradient(circle at 80% 90%, rgba(168,85,247,0.10) 0%, transparent 40%)",
                "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.05) 0%, transparent 60%)",
                "linear-gradient(180deg, #0c1222 0%, #121a30 50%, #0c1222 100%)",
              ].join(", "),
            }}
          />

          {/* 12 modules build up one by one */}
          {DISPLAY_MODULES.map((mod, i) => {
            const delay = 25 + i * 8;
            const modOpacity = interpolate(
              frame,
              [delay, delay + 16],
              [0, 1],
              clamp,
            );
            const modSpring = spring({
              frame: frame - delay,
              fps,
              config: { damping: 18, stiffness: 120 },
            });
            const slideY = interpolate(modSpring, [0, 1], [10, 0], clamp);

            return (
              <div
                key={mod.label}
                style={{
                  position: "absolute",
                  left: mod.x * SCALE,
                  top: mod.y * SCALE + slideY,
                  width: mod.w * SCALE,
                  height: mod.h * SCALE,
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  borderRadius: 8,
                  opacity: modOpacity,
                  overflow: "hidden",
                }}
              >
                <ModuleContent label={mod.label} />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
