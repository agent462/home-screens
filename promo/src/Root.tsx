import React from "react";
import { Composition } from "remotion";
import { HomeScreensPromo } from "./HomeScreensPromo";

const FPS = 30;
const DURATION = 45;

export const Root: React.FC = () => (
  <Composition
    id="HomeScreensPromo"
    component={HomeScreensPromo}
    durationInFrames={FPS * DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
