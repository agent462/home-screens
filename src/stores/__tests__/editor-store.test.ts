import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ScreenConfiguration } from '@/types/config';
import { DEFAULT_MODULE_STYLE } from '@/types/config';

// Must import the module registry so modules are registered before store operations
import '@/lib/module-registry';

// Dynamic import to reset store state between tests
let useEditorStore: typeof import('@/stores/editor-store').useEditorStore;

function makeConfig(overrides?: Partial<ScreenConfiguration>): ScreenConfiguration {
  return {
    version: 1,
    settings: {
      rotationIntervalMs: 30000,
      weather: { provider: 'weatherapi', apiKey: '', latitude: 0, longitude: 0, units: 'imperial' },
      calendar: { googleCalendarId: '', googleCalendarIds: [], maxEvents: 10, daysAhead: 7 },
    },
    screens: [
      {
        id: 'screen-1',
        name: 'Screen 1',
        backgroundImage: '',
        modules: [],
      },
    ],
    ...overrides,
  };
}

beforeEach(async () => {
  vi.resetModules();
  // Re-import to get fresh store
  await import('@/lib/module-registry');
  const mod = await import('@/stores/editor-store');
  useEditorStore = mod.useEditorStore;
});

describe('editor store', () => {
  describe('addModule', () => {
    it('adds a module to the correct screen', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig(), isDirty: false });

      store.getState().addModule('screen-1', 'clock');

      const state = store.getState();
      const screen = state.config!.screens[0];
      expect(screen.modules).toHaveLength(1);
      expect(screen.modules[0].type).toBe('clock');
      expect(screen.modules[0].position).toEqual({ x: 100, y: 100 });
      expect(screen.modules[0].style).toEqual(DEFAULT_MODULE_STYLE);
      expect(state.isDirty).toBe(true);
      expect(state.selectedModuleId).toBe(screen.modules[0].id);
    });

    it('does nothing when config is null', () => {
      const store = useEditorStore;
      store.setState({ config: null });
      store.getState().addModule('screen-1', 'clock');
      expect(store.getState().config).toBeNull();
    });

    it('does nothing for unknown module type', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig(), isDirty: false });
      store.getState().addModule('screen-1', 'nonexistent' as never);
      expect(store.getState().config!.screens[0].modules).toHaveLength(0);
      expect(store.getState().isDirty).toBe(false);
    });
  });

  describe('removeModule', () => {
    it('removes a module and clears selection if it was selected', () => {
      const store = useEditorStore;
      const config = makeConfig();
      config.screens[0].modules = [{
        id: 'mod-1', type: 'clock', position: { x: 0, y: 0 }, size: { w: 400, h: 200 },
        zIndex: 1, config: {}, style: { ...DEFAULT_MODULE_STYLE },
      }];
      store.setState({ config, selectedModuleId: 'mod-1' });

      store.getState().removeModule('screen-1', 'mod-1');

      expect(store.getState().config!.screens[0].modules).toHaveLength(0);
      expect(store.getState().selectedModuleId).toBeNull();
      expect(store.getState().isDirty).toBe(true);
    });

    it('keeps selection if a different module was removed', () => {
      const store = useEditorStore;
      const config = makeConfig();
      config.screens[0].modules = [
        { id: 'mod-1', type: 'clock', position: { x: 0, y: 0 }, size: { w: 400, h: 200 }, zIndex: 1, config: {}, style: { ...DEFAULT_MODULE_STYLE } },
        { id: 'mod-2', type: 'text', position: { x: 100, y: 100 }, size: { w: 400, h: 150 }, zIndex: 1, config: {}, style: { ...DEFAULT_MODULE_STYLE } },
      ];
      store.setState({ config, selectedModuleId: 'mod-1' });

      store.getState().removeModule('screen-1', 'mod-2');

      expect(store.getState().selectedModuleId).toBe('mod-1');
      expect(store.getState().config!.screens[0].modules).toHaveLength(1);
    });
  });

  describe('moveModule', () => {
    it('updates module position', () => {
      const store = useEditorStore;
      const config = makeConfig();
      config.screens[0].modules = [{
        id: 'mod-1', type: 'clock', position: { x: 0, y: 0 }, size: { w: 400, h: 200 },
        zIndex: 1, config: {}, style: { ...DEFAULT_MODULE_STYLE },
      }];
      store.setState({ config });

      store.getState().moveModule('screen-1', 'mod-1', { x: 200, y: 300 });

      const mod = store.getState().config!.screens[0].modules[0];
      expect(mod.position).toEqual({ x: 200, y: 300 });
    });
  });

  describe('resizeModule', () => {
    it('updates module size', () => {
      const store = useEditorStore;
      const config = makeConfig();
      config.screens[0].modules = [{
        id: 'mod-1', type: 'clock', position: { x: 0, y: 0 }, size: { w: 400, h: 200 },
        zIndex: 1, config: {}, style: { ...DEFAULT_MODULE_STYLE },
      }];
      store.setState({ config });

      store.getState().resizeModule('screen-1', 'mod-1', { w: 600, h: 400 });

      const mod = store.getState().config!.screens[0].modules[0];
      expect(mod.size).toEqual({ w: 600, h: 400 });
    });
  });

  describe('updateModuleStyle', () => {
    it('merges partial style updates', () => {
      const store = useEditorStore;
      const config = makeConfig();
      config.screens[0].modules = [{
        id: 'mod-1', type: 'clock', position: { x: 0, y: 0 }, size: { w: 400, h: 200 },
        zIndex: 1, config: {}, style: { ...DEFAULT_MODULE_STYLE },
      }];
      store.setState({ config });

      store.getState().updateModuleStyle('screen-1', 'mod-1', { opacity: 0.5, fontSize: 24 });

      const style = store.getState().config!.screens[0].modules[0].style;
      expect(style.opacity).toBe(0.5);
      expect(style.fontSize).toBe(24);
      // Other properties unchanged
      expect(style.borderRadius).toBe(DEFAULT_MODULE_STYLE.borderRadius);
    });
  });

  describe('addScreen', () => {
    it('adds a new screen and selects it', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig(), selectedScreenId: 'screen-1' });

      store.getState().addScreen();

      const state = store.getState();
      expect(state.config!.screens).toHaveLength(2);
      expect(state.config!.screens[1].name).toBe('Screen 2');
      expect(state.config!.screens[1].modules).toEqual([]);
      expect(state.selectedScreenId).toBe(state.config!.screens[1].id);
      expect(state.selectedModuleId).toBeNull();
      expect(state.isDirty).toBe(true);
    });
  });

  describe('removeScreen', () => {
    it('removes a screen and reselects if it was selected', () => {
      const store = useEditorStore;
      const config = makeConfig({
        screens: [
          { id: 's1', name: 'Screen 1', backgroundImage: '', modules: [] },
          { id: 's2', name: 'Screen 2', backgroundImage: '', modules: [] },
        ],
      });
      store.setState({ config, selectedScreenId: 's2' });

      store.getState().removeScreen('s2');

      expect(store.getState().config!.screens).toHaveLength(1);
      expect(store.getState().selectedScreenId).toBe('s1');
    });

    it('prevents removing the last screen', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig(), selectedScreenId: 'screen-1', isDirty: false });

      store.getState().removeScreen('screen-1');

      expect(store.getState().config!.screens).toHaveLength(1);
      expect(store.getState().isDirty).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('merges partial settings', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig() });

      store.getState().updateSettings({ rotationIntervalMs: 60000 });

      const settings = store.getState().config!.settings;
      expect(settings.rotationIntervalMs).toBe(60000);
      // Other settings unchanged
      expect(settings.weather.provider).toBe('weatherapi');
    });
  });

  describe('importConfig', () => {
    it('imports valid config JSON', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig() });

      const imported = makeConfig({
        screens: [
          { id: 'imported', name: 'Imported', backgroundImage: '/bg.png', modules: [] },
        ],
      });
      store.getState().importConfig(JSON.stringify(imported));

      expect(store.getState().config!.screens[0].id).toBe('imported');
      expect(store.getState().selectedScreenId).toBe('imported');
      expect(store.getState().isDirty).toBe(true);
    });

    it('rejects config missing screens', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig() });

      expect(() => {
        store.getState().importConfig(JSON.stringify({ settings: {} }));
      }).toThrow('Invalid config file');
    });

    it('rejects config missing settings', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig() });

      expect(() => {
        store.getState().importConfig(JSON.stringify({ screens: [] }));
      }).toThrow('Invalid config file');
    });

    it('rejects invalid JSON', () => {
      const store = useEditorStore;
      store.setState({ config: makeConfig() });

      expect(() => {
        store.getState().importConfig('not json');
      }).toThrow();
    });
  });
});
