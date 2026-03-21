import type { ComponentType } from 'react';
import type { ModuleCategory } from '@/lib/module-registry';

/** Schema for a plugin's manifest.json */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  minAppVersion: string;
  moduleType: string; // becomes "plugin:<moduleType>" in the app
  category: ModuleCategory;
  icon: string; // lucide icon name
  defaultConfig: Record<string, unknown>;
  defaultSize: { w: number; h: number };
  configSchema?: PluginConfigSchema;
  exports: {
    component: string; // typically "default"
    configSection?: string; // optional named export
  };
  dataRequirements?: PluginDataRequirement[];
  prefetchUrl?: string | null;
}

export type PluginDataRequirement = 'location' | 'weather' | 'calendar';

/** JSON Schema with UI widget annotations for declarative config rendering */
export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, PluginConfigProperty>;
}

export interface PluginConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array';
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  enumLabels?: string[];
  'ui:widget'?: 'slider' | 'toggle' | 'text' | 'select' | 'color' | 'number';
  'ui:step'?: number;
}

/** Record for an installed plugin in data/plugins/installed.json */
export interface InstalledPlugin {
  id: string;
  version: string;
  installedAt: string;
  enabled: boolean;
  moduleType: string; // raw type from manifest (without "plugin:" prefix)
}

export interface InstalledPluginsFile {
  schemaVersion: number;
  plugins: InstalledPlugin[];
}

/** Runtime state of a loaded plugin in the Zustand store */
export interface LoadedPlugin {
  component: ComponentType<Record<string, unknown>>;
  manifest: PluginManifest;
  configSection?: ComponentType<PluginConfigSectionProps>;
}

/** Error state for a plugin that failed to load */
export interface PluginError {
  message: string;
  phase: 'load' | 'execute' | 'register';
}

/** Props injected into a plugin's custom ConfigSection component */
export interface PluginConfigSectionProps {
  config: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  moduleId: string;
  screenId: string;
}

/** Entry in the external plugin registry (plugins.json) */
export interface RegistryPlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  repo: string;
  license: string;
  category: ModuleCategory;
  tags: string[];
  icon: string;
  verified: boolean;
  versions: RegistryPluginVersion[];
}

export interface RegistryPluginVersion {
  version: string;
  minAppVersion: string;
  maxAppVersion?: string;
  releaseDate: string;
  downloadUrl: string;
  sha256: string;
  changelog?: string;
}

export interface PluginRegistry {
  schemaVersion: number;
  lastUpdated: string;
  plugins: RegistryPlugin[];
}
