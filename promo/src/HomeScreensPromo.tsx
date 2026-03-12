import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { theme } from "./theme";
import { Intro } from "./scenes/Intro";
import { Tagline } from "./scenes/Tagline";
import { DisplayHero } from "./scenes/DisplayHero";
import { ModuleShowcase } from "./scenes/ModuleShowcase";
import { Features } from "./scenes/Features";
import { Outro } from "./scenes/Outro";

export const HomeScreensPromo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
    {/* 0-4s: Logo reveal */}
    <Sequence from={0} durationInFrames={120}>
      <Intro />
    </Sequence>

    {/* 4-7s: Tagline */}
    <Sequence from={120} durationInFrames={90}>
      <Tagline />
    </Sequence>

    {/* 7-16s: Product hero shot */}
    <Sequence from={210} durationInFrames={270}>
      <DisplayHero />
    </Sequence>

    {/* 16-30s: Module deep dive */}
    <Sequence from={480} durationInFrames={420}>
      <ModuleShowcase />
    </Sequence>

    {/* 30-38s: Key features */}
    <Sequence from={900} durationInFrames={240}>
      <Features />
    </Sequence>

    {/* 38-45s: CTA */}
    <Sequence from={1140} durationInFrames={210}>
      <Outro />
    </Sequence>
  </AbsoluteFill>
);
