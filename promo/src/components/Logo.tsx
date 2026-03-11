import React from "react";

interface LogoProps {
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ size = 80 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.35,
      background:
        "linear-gradient(160deg, #0f172a 0%, #10253d 48%, #143a58 100%)",
      border: "1px solid rgba(34, 211, 238, 0.25)",
      boxShadow: "0 10px 30px rgba(6, 182, 212, 0.18)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg
      viewBox="0 0 48 48"
      width={size * 0.7}
      height={size * 0.7}
      fill="none"
    >
      <path
        d="M9 21.5L24 10L39 21.5"
        stroke="#A5F3FC"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="11.5"
        y="20.5"
        width="25"
        height="16"
        rx="5"
        fill="#082F49"
        stroke="#67E8F9"
        strokeWidth="2.5"
      />
      <rect
        x="17"
        y="25"
        width="14"
        height="2.5"
        rx="1.25"
        fill="#A5F3FC"
        opacity="0.95"
      />
      <rect
        x="17"
        y="29.5"
        width="9"
        height="2.5"
        rx="1.25"
        fill="#CFFAFE"
        opacity="0.85"
      />
      <path
        d="M29 36.5V31.5H33V36.5"
        stroke="#E0F2FE"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
