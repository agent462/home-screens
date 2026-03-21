import { describe, it, expect, afterEach } from 'vitest';
import {
  registerPluginModule,
  unregisterModule,
  getModuleDefinition,
  getAllModuleDefinitions,
  getModulesByCategory,
} from '@/lib/module-registry';
import type { PluginManifest } from '@/types/plugins';
import type { ModuleType } from '@/types/config';
import { Puzzle } from 'lucide-react';

const testManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin',
  author: 'tester',
  license: 'MIT',
  minAppVersion: '0.16.0',
  moduleType: 'test-widget',
  category: 'Weather & Environment',
  icon: 'NonExistent', // should fall back to Puzzle
  defaultConfig: { foo: 'bar' },
  defaultSize: { w: 500, h: 400 },
  exports: { component: 'default' },
  dataRequirements: ['location'],
};

const pluginType: ModuleType = 'plugin:test-widget';

afterEach(() => {
  // Clean up test registrations
  unregisterModule(pluginType);
});

describe('registerPluginModule', () => {
  it('registers a plugin with the plugin: prefix', () => {
    registerPluginModule(testManifest);
    const def = getModuleDefinition(pluginType);
    expect(def).toBeDefined();
    expect(def!.type).toBe('plugin:test-widget');
  });

  it('maps manifest fields correctly', () => {
    registerPluginModule(testManifest);
    const def = getModuleDefinition(pluginType)!;
    expect(def.label).toBe('Test Plugin');
    expect(def.category).toBe('Weather & Environment');
    expect(def.defaultConfig).toEqual({ foo: 'bar' });
    expect(def.defaultSize).toEqual({ w: 500, h: 400 });
    expect(def.dataRequirements).toEqual(['location']);
  });

  it('falls back to Puzzle icon for unknown icon names', () => {
    registerPluginModule(testManifest);
    const def = getModuleDefinition(pluginType)!;
    expect(def.icon).toBe(Puzzle);
  });

  it('falls back to default size when manifest omits defaultSize', () => {
    const manifest = { ...testManifest, defaultSize: undefined as unknown as { w: number; h: number } };
    registerPluginModule(manifest);
    const def = getModuleDefinition(pluginType)!;
    expect(def.defaultSize).toEqual({ w: 400, h: 300 });
  });

  it('appears in getAllModuleDefinitions', () => {
    registerPluginModule(testManifest);
    const all = getAllModuleDefinitions();
    expect(all.some((d) => d.type === pluginType)).toBe(true);
  });

  it('appears in getModulesByCategory under the correct category', () => {
    registerPluginModule(testManifest);
    const byCategory = getModulesByCategory();
    const weatherModules = byCategory.get('Weather & Environment') ?? [];
    expect(weatherModules.some((d) => d.type === pluginType)).toBe(true);
  });

  it('does not crash getModulesByCategory for unknown category', () => {
    // Force an invalid category to test the guard
    const badManifest = { ...testManifest, category: 'Nonexistent' as never };
    registerPluginModule(badManifest);
    // Should not throw
    const byCategory = getModulesByCategory();
    // The plugin should NOT appear in any category group
    let found = false;
    for (const defs of byCategory.values()) {
      if (defs.some((d) => d.type === pluginType)) found = true;
    }
    expect(found).toBe(false);
  });
});

describe('unregisterModule', () => {
  it('removes a previously registered plugin', () => {
    registerPluginModule(testManifest);
    expect(getModuleDefinition(pluginType)).toBeDefined();
    unregisterModule(pluginType);
    expect(getModuleDefinition(pluginType)).toBeUndefined();
  });

  it('is a no-op for non-existent types', () => {
    // Should not throw
    unregisterModule('plugin:nonexistent');
  });
});
