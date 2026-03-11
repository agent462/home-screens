import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScreenConfiguration,
  ModuleType,
  ModuleInstance,
  ModuleStyle,
  ModulePosition,
  ModuleSize,
  GlobalSettings,
  Screen,
  Profile,
} from '@/types/config';
import { DEFAULT_MODULE_STYLE as defaultStyle } from '@/types/config';
import { getModuleDefinition } from '@/lib/module-registry';
import { editorFetch } from '@/lib/editor-fetch';

interface EditorState {
  config: ScreenConfiguration | null;
  selectedScreenId: string | null;
  selectedModuleId: string | null;
  isDirty: boolean;
  isSaving: boolean;

  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  selectScreen: (id: string) => void;
  selectModule: (id: string | null) => void;
  addModule: (screenId: string, type: ModuleType, position?: ModulePosition) => void;
  removeModule: (screenId: string, moduleId: string) => void;
  updateModule: (screenId: string, moduleId: string, updates: Partial<ModuleInstance>) => void;
  updateModuleStyle: (screenId: string, moduleId: string, style: Partial<ModuleStyle>) => void;
  moveModule: (screenId: string, moduleId: string, position: ModulePosition) => void;
  resizeModule: (screenId: string, moduleId: string, size: ModuleSize) => void;
  addScreen: () => void;
  removeScreen: (id: string) => void;
  updateScreen: (id: string, updates: Partial<Screen>) => void;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
  addProfile: (name: string) => void;
  removeProfile: (id: string) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  reorderProfiles: (fromIndex: number, toIndex: number) => void;
  setActiveProfile: (id: string | undefined) => void;
  exportConfig: () => void;
  importConfig: (json: string) => void;
}

function updateModuleInConfig(
  config: ScreenConfiguration,
  screenId: string,
  moduleId: string,
  updater: (mod: ModuleInstance) => ModuleInstance,
): ScreenConfiguration {
  return {
    ...config,
    screens: config.screens.map((s) =>
      s.id === screenId
        ? { ...s, modules: s.modules.map((m) => (m.id === moduleId ? updater(m) : m)) }
        : s,
    ),
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  config: null,
  selectedScreenId: null,
  selectedModuleId: null,
  isDirty: false,
  isSaving: false,

  loadConfig: async () => {
    try {
      const res = await editorFetch('/api/config');
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const config: ScreenConfiguration = await res.json();
      if (!config.screens) throw new Error('Invalid config');
      // Restore selected screen from URL if present, otherwise default to first
      const params = new URLSearchParams(window.location.search);
      const screenParam = params.get('screen');
      const restoredScreen = screenParam && config.screens.find((s) => s.id === screenParam);
      set({
        config,
        selectedScreenId: restoredScreen ? restoredScreen.id : config.screens[0]?.id ?? null,
        selectedModuleId: null,
        isDirty: false,
      });
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  },

  saveConfig: async () => {
    const { config } = get();
    if (!config) return;
    set({ isSaving: true });
    try {
      const res = await editorFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      set({ isSaving: false, isDirty: false });
    } catch (err) {
      set({ isSaving: false });
      console.error('Failed to save config:', err);
    }
  },

  selectScreen: (id) => {
    set({ selectedScreenId: id, selectedModuleId: null });
    const url = new URL(window.location.href);
    url.searchParams.set('screen', id);
    window.history.replaceState(null, '', url.toString());
  },

  selectModule: (id) => set({ selectedModuleId: id }),

  addModule: (screenId, type, position) => {
    const { config } = get();
    if (!config) return;
    const def = getModuleDefinition(type);
    if (!def) return;
    const newModule: ModuleInstance = {
      id: uuidv4(),
      type,
      position: position ?? { x: 100, y: 100 },
      size: { ...def.defaultSize },
      zIndex: 1,
      config: { ...def.defaultConfig },
      style: { ...defaultStyle, ...def.defaultStyle },
    };
    const updated = {
      ...config,
      screens: config.screens.map((s) =>
        s.id === screenId ? { ...s, modules: [...s.modules, newModule] } : s,
      ),
    };
    set({ config: updated, isDirty: true, selectedModuleId: newModule.id });
  },

  removeModule: (screenId, moduleId) => {
    const { config, selectedModuleId } = get();
    if (!config) return;
    const updated = {
      ...config,
      screens: config.screens.map((s) =>
        s.id === screenId ? { ...s, modules: s.modules.filter((m) => m.id !== moduleId) } : s,
      ),
    };
    set({
      config: updated,
      isDirty: true,
      selectedModuleId: selectedModuleId === moduleId ? null : selectedModuleId,
    });
  },

  updateModule: (screenId, moduleId, updates) => {
    const { config } = get();
    if (!config) return;
    set({
      config: updateModuleInConfig(config, screenId, moduleId, (m) => ({ ...m, ...updates })),
      isDirty: true,
    });
  },

  updateModuleStyle: (screenId, moduleId, style) => {
    const { config } = get();
    if (!config) return;
    set({
      config: updateModuleInConfig(config, screenId, moduleId, (m) => ({
        ...m,
        style: { ...m.style, ...style },
      })),
      isDirty: true,
    });
  },

  moveModule: (screenId, moduleId, position) => {
    const { config } = get();
    if (!config) return;
    set({
      config: updateModuleInConfig(config, screenId, moduleId, (m) => ({ ...m, position })),
      isDirty: true,
    });
  },

  resizeModule: (screenId, moduleId, size) => {
    const { config } = get();
    if (!config) return;
    set({
      config: updateModuleInConfig(config, screenId, moduleId, (m) => ({ ...m, size })),
      isDirty: true,
    });
  },

  addScreen: () => {
    const { config } = get();
    if (!config) return;
    const newScreen: Screen = {
      id: uuidv4(),
      name: `Screen ${config.screens.length + 1}`,
      backgroundImage: '',
      modules: [],
    };
    set({
      config: { ...config, screens: [...config.screens, newScreen] },
      selectedScreenId: newScreen.id,
      selectedModuleId: null,
      isDirty: true,
    });
    const url = new URL(window.location.href);
    url.searchParams.set('screen', newScreen.id);
    window.history.replaceState(null, '', url.toString());
  },

  removeScreen: (id) => {
    const { config, selectedScreenId } = get();
    if (!config || config.screens.length <= 1) return;
    const screens = config.screens.filter((s) => s.id !== id);
    // Prune deleted screen from all profile screenIds
    const profiles = config.profiles?.map((p) => ({
      ...p,
      screenIds: p.screenIds.filter((sid) => sid !== id),
    }));
    const newSelectedId = selectedScreenId === id ? screens[0]?.id ?? null : selectedScreenId;
    set({
      config: { ...config, screens, profiles },
      selectedScreenId: newSelectedId,
      selectedModuleId: null,
      isDirty: true,
    });
    if (newSelectedId) {
      const url = new URL(window.location.href);
      url.searchParams.set('screen', newSelectedId);
      window.history.replaceState(null, '', url.toString());
    }
  },

  updateScreen: (id, updates) => {
    const { config } = get();
    if (!config) return;
    set({
      config: {
        ...config,
        screens: config.screens.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      },
      isDirty: true,
    });
  },

  updateSettings: (settings) => {
    const { config } = get();
    if (!config) return;
    set({
      config: { ...config, settings: { ...config.settings, ...settings } },
      isDirty: true,
    });
  },

  addProfile: (name: string) => {
    const { config } = get();
    if (!config) return;
    const newProfile: Profile = {
      id: uuidv4(),
      name,
      screenIds: config.screens.map((s) => s.id),
    };
    set({
      config: { ...config, profiles: [...(config.profiles ?? []), newProfile] },
      isDirty: true,
    });
  },

  removeProfile: (id: string) => {
    const { config } = get();
    if (!config) return;
    const profiles = (config.profiles ?? []).filter((p) => p.id !== id);
    const settings = config.settings.activeProfile === id
      ? { ...config.settings, activeProfile: undefined }
      : config.settings;
    set({
      config: { ...config, profiles, settings },
      isDirty: true,
    });
  },

  updateProfile: (id: string, updates: Partial<Profile>) => {
    const { config } = get();
    if (!config) return;
    set({
      config: {
        ...config,
        profiles: (config.profiles ?? []).map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      },
      isDirty: true,
    });
  },

  reorderProfiles: (fromIndex: number, toIndex: number) => {
    const { config } = get();
    if (!config?.profiles) return;
    const profiles = [...config.profiles];
    const [moved] = profiles.splice(fromIndex, 1);
    profiles.splice(toIndex, 0, moved);
    set({ config: { ...config, profiles }, isDirty: true });
  },

  setActiveProfile: (id: string | undefined) => {
    const { config } = get();
    if (!config) return;
    set({
      config: { ...config, settings: { ...config.settings, activeProfile: id } },
      isDirty: true,
    });
  },

  exportConfig: () => {
    const { config } = get();
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'home-screen-config.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importConfig: (json: string) => {
    const config = JSON.parse(json) as ScreenConfiguration;
    if (!config.screens || !Array.isArray(config.screens) || !config.settings) {
      throw new Error('Invalid config file: missing screens or settings');
    }
    const firstId = config.screens[0]?.id ?? null;
    set({
      config,
      selectedScreenId: firstId,
      selectedModuleId: null,
      isDirty: true,
    });
    if (firstId) {
      const url = new URL(window.location.href);
      url.searchParams.set('screen', firstId);
      window.history.replaceState(null, '', url.toString());
    }
  },
}));
