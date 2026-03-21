import type { ComponentType } from 'react';
import type { PluginManifest, InstalledPlugin, PluginConfigSectionProps } from '@/types/plugins';
import { usePluginStore } from '@/stores/plugin-store';
import { registerPluginModule } from '@/lib/module-registry';
import { registerFetchKey } from '@/lib/fetch-keys';

/**
 * Load all installed+enabled plugins. Called from the plugin Zustand store.
 *
 * Loading sequence per plugin:
 * 1. GET /api/plugins/manifest/<id> → manifest
 * 2. GET /api/plugins/bundle/<id>?v=<version> → IIFE bundle text
 * 3. Execute bundle via script injection → read window.__HS_PLUGIN__
 * 4. Register into Zustand store + module registry
 */
export async function loadAllPlugins(): Promise<void> {
  const store = usePluginStore.getState();

  // Clear previous plugin registrations before reloading
  store.clearPlugins();

  // Fetch installed plugins list
  let plugins: InstalledPlugin[];
  try {
    const res = await fetch('/api/plugins/installed');
    if (!res.ok) return;
    const data = await res.json();
    plugins = (data.plugins ?? []).filter((p: InstalledPlugin) => p.enabled);
  } catch {
    return;
  }

  if (plugins.length === 0) return;

  // Load each plugin in parallel, errors don't block others
  await Promise.allSettled(
    plugins.map((plugin) => loadSinglePlugin(plugin, store)),
  );
}

async function loadSinglePlugin(
  plugin: InstalledPlugin,
  store: ReturnType<typeof usePluginStore.getState>,
): Promise<void> {
  const moduleType = `plugin:${plugin.moduleType}`;

  try {
    // 1. Fetch manifest
    const manifestRes = await fetch(`/api/plugins/manifest/${plugin.id}`);
    if (!manifestRes.ok) {
      throw new Error(`Manifest fetch failed: ${manifestRes.status}`);
    }
    const manifest: PluginManifest = await manifestRes.json();

    // 2. Validate manifest before using it
    if (!manifest.id || !manifest.name || !manifest.moduleType) {
      throw new Error('Invalid manifest: missing required fields');
    }
    if (!manifest.category) {
      throw new Error('Invalid manifest: missing category');
    }

    // 3. Fetch bundle (version-stamped URL for cache busting)
    const bundleRes = await fetch(`/api/plugins/bundle/${plugin.id}?v=${plugin.version}`);
    if (!bundleRes.ok) {
      throw new Error(`Bundle fetch failed: ${bundleRes.status}`);
    }
    const bundleText = await bundleRes.text();

    // 4. Execute IIFE bundle
    const { component, configSection } = executeBundle(bundleText, manifest);

    // 5. Register into module registry and Zustand store
    registerPluginModule(manifest);
    store.registerPlugin(moduleType, component, manifest, configSection);

    // 6. Wire prefetchUrl into the fetch key registry if declared
    if (manifest.prefetchUrl) {
      const url = manifest.prefetchUrl;
      registerFetchKey(`plugin:${manifest.moduleType}`, {
        buildUrl: () => url,
        ttlMs: 300_000, // default 5min TTL for plugin prefetch
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to load plugin ${plugin.id}:`, message);
    store.setError(plugin.id, { message, phase: 'load' });
  }
}

/**
 * Execute an IIFE bundle by injecting it as a script tag.
 * The bundle assigns to window.__HS_PLUGIN__ which we read and clean up.
 */
function executeBundle(
  bundleText: string,
  manifest: PluginManifest,
): {
  component: ComponentType<Record<string, unknown>>;
  configSection?: ComponentType<PluginConfigSectionProps>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;

  // Clean up any previous plugin global
  delete win.__HS_PLUGIN__;

  try {
    // Create and inject script element (inline scripts execute synchronously)
    const script = document.createElement('script');
    script.textContent = bundleText;
    document.head.appendChild(script);
    document.head.removeChild(script);

    // Read the plugin exports from the global
    const pluginExports = win.__HS_PLUGIN__ as Record<string, unknown> | undefined;

    if (!pluginExports) {
      throw new Error('Bundle did not set window.__HS_PLUGIN__');
    }

    // Resolve the display component
    const componentExport = manifest.exports?.component ?? 'default';
    const component = (pluginExports[componentExport] ?? pluginExports.default) as
      | ComponentType<Record<string, unknown>>
      | undefined;

    if (!component) {
      throw new Error(`Bundle missing component export "${componentExport}"`);
    }

    // Resolve optional config section
    let configSection: ComponentType<PluginConfigSectionProps> | undefined;
    if (manifest.exports?.configSection) {
      configSection = pluginExports[manifest.exports.configSection] as
        | ComponentType<PluginConfigSectionProps>
        | undefined;
    }

    return { component, configSection };
  } catch (err) {
    throw new Error(`Bundle execution failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    delete win.__HS_PLUGIN__;
  }
}
