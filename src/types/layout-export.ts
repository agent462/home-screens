import type { Screen, Profile, TransitionEffect } from './config';

export interface LayoutExportMetadata {
  name: string;
  description?: string;
  exportedAt: string;             // ISO date
  configVersion: number;          // from ScreenConfiguration.version
  sourceDisplay: { width: number; height: number };
  screenCount: number;
  moduleCount: number;
}

export interface LayoutExportVisual {
  rotationIntervalMs: number;
  transitionEffect?: TransitionEffect;
  transitionDuration?: number;
}

export interface LayoutExport {
  _type: 'home-screens-layout';   // discriminator — not a raw config
  _version: 1;                    // layout schema version
  metadata: LayoutExportMetadata;
  visual: LayoutExportVisual;
  screens: Screen[];
  profiles?: Profile[];
}
