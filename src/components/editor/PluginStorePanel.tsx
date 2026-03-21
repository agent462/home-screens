'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { editorFetch } from '@/lib/editor-fetch';
import { usePluginStore } from '@/stores/plugin-store';
import Button from '@/components/ui/Button';
import type { RegistryPlugin, InstalledPlugin, PluginRegistry } from '@/types/plugins';

interface PluginStorePanelProps {
  onClose: () => void;
}

type Tab = 'browse' | 'installed' | 'updates';

export default function PluginStorePanel({ onClose }: PluginStorePanelProps) {
  const [tab, setTab] = useState<Tab>('browse');
  const [registry, setRegistry] = useState<RegistryPlugin[]>([]);
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const pluginErrors = usePluginStore((s) => s.errors);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regRes, instRes] = await Promise.all([
        fetch('/api/plugins/registry').catch(() => null),
        fetch('/api/plugins/installed'),
      ]);
      if (regRes?.ok) {
        const data: PluginRegistry = await regRes.json();
        setRegistry(data.plugins ?? []);
      }
      if (instRes.ok) {
        const data = await instRes.json();
        setInstalled(data.plugins ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const installedIds = new Set(installed.map((p) => p.id));

  const runAction = async (pluginId: string, method: string, body: Record<string, unknown>) => {
    setActionInProgress(pluginId);
    setActionError(null);
    try {
      const res = await editorFetch('/api/plugins/install', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      await fetchData();
      usePluginStore.getState().loadPlugins();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInstall = (pluginId: string, version: string) =>
    runAction(pluginId, 'POST', { pluginId, version });

  const handleUninstall = (pluginId: string) =>
    runAction(pluginId, 'DELETE', { pluginId });

  const handleToggle = (pluginId: string, enabled: boolean) =>
    runAction(pluginId, 'PATCH', { pluginId, enabled });

  const filteredRegistry = registry.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s)
      || p.description.toLowerCase().includes(s)
      || p.tags?.some((t) => t.toLowerCase().includes(s));
  });

  const updatable = installed.filter((inst) => {
    const reg = registry.find((r) => r.id === inst.id);
    if (!reg) return false;
    const latest = reg.versions[0];
    return latest && latest.version !== inst.version;
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl h-[80vh] rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-700 px-5 py-3.5">
          <h2 className="text-lg font-semibold text-neutral-100">Plugins</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-neutral-700">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {(['browse', 'installed', 'updates'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-neutral-700 text-neutral-100'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'updates' && updatable.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full">
                  {updatable.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {actionError && (
          <div className="mx-5 mt-2 px-3 py-2 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg flex items-center justify-between">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-sm text-neutral-500 mt-8 text-center">Loading...</p>
          ) : tab === 'browse' ? (
            <BrowseTab
              plugins={filteredRegistry}
              installedIds={installedIds}
              search={search}
              onSearchChange={setSearch}
              onInstall={handleInstall}
              actionInProgress={actionInProgress}
            />
          ) : tab === 'installed' ? (
            <InstalledTab
              installed={installed}
              errors={pluginErrors}
              onUninstall={handleUninstall}
              onToggle={handleToggle}
              actionInProgress={actionInProgress}
            />
          ) : (
            <UpdatesTab
              registry={registry}
              updatable={updatable}
              onInstall={handleInstall}
              actionInProgress={actionInProgress}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function BrowseTab({
  plugins,
  installedIds,
  search,
  onSearchChange,
  onInstall,
  actionInProgress,
}: {
  plugins: RegistryPlugin[];
  installedIds: Set<string>;
  search: string;
  onSearchChange: (s: string) => void;
  onInstall: (id: string, version: string) => void;
  actionInProgress: string | null;
}) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search plugins..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-600 rounded-lg text-neutral-200 placeholder:text-neutral-500"
      />
      {plugins.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-8">
          {search ? 'No plugins match your search' : 'No plugins available in the registry'}
        </p>
      ) : (
        plugins.map((plugin) => {
          const latest = plugin.versions[0];
          const isInstalled = installedIds.has(plugin.id);
          return (
            <div key={plugin.id} className="flex items-start gap-3 p-3 rounded-lg border border-neutral-700 bg-neutral-800/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-100">{plugin.name}</span>
                  {plugin.verified && (
                    <span title="Verified"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /></span>
                  )}
                  <span className="text-xs text-neutral-500">{latest?.version}</span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">{plugin.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-neutral-500">{plugin.author}</span>
                  <span className="text-[10px] text-neutral-600">{plugin.category}</span>
                </div>
              </div>
              <div className="shrink-0">
                {isInstalled ? (
                  <span className="text-xs text-green-400">Installed</span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!latest || actionInProgress === plugin.id}
                    onClick={() => latest && onInstall(plugin.id, latest.version)}
                  >
                    {actionInProgress === plugin.id ? 'Installing...' : 'Install'}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function InstalledTab({
  installed,
  errors,
  onUninstall,
  onToggle,
  actionInProgress,
}: {
  installed: InstalledPlugin[];
  errors: Map<string, { message: string }>;
  onUninstall: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  actionInProgress: string | null;
}) {
  if (installed.length === 0) {
    return <p className="text-sm text-neutral-500 text-center py-8">No plugins installed</p>;
  }

  return (
    <div className="space-y-2">
      {installed.map((plugin) => {
        const error = errors.get(plugin.id);
        return (
          <div key={plugin.id} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-700 bg-neutral-800/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-100">{plugin.id}</span>
                <span className="text-xs text-neutral-500">v{plugin.version}</span>
              </div>
              {error && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400">{error.message}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onToggle(plugin.id, !plugin.enabled)}
              disabled={actionInProgress === plugin.id}
              className="p-1 text-neutral-400 hover:text-neutral-200"
              title={plugin.enabled ? 'Disable' : 'Enable'}
            >
              {plugin.enabled ? (
                <ToggleRight className="w-5 h-5 text-green-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-neutral-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onUninstall(plugin.id)}
              disabled={actionInProgress === plugin.id}
              className="p-1 text-neutral-400 hover:text-red-400"
              title="Uninstall"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function UpdatesTab({
  registry,
  updatable,
  onInstall,
  actionInProgress,
}: {
  registry: RegistryPlugin[];
  updatable: InstalledPlugin[];
  onInstall: (id: string, version: string) => void;
  actionInProgress: string | null;
}) {
  if (updatable.length === 0) {
    return <p className="text-sm text-neutral-500 text-center py-8">All plugins are up to date</p>;
  }

  return (
    <div className="space-y-2">
      {updatable.map((plugin) => {
        const reg = registry.find((r) => r.id === plugin.id);
        const latest = reg?.versions[0];
        return (
          <div key={plugin.id} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-700 bg-neutral-800/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-100">{plugin.id}</span>
                <span className="text-xs text-neutral-500">
                  v{plugin.version} → v{latest?.version}
                </span>
              </div>
              {latest?.changelog && (
                <p className="text-xs text-neutral-400 mt-0.5">{latest.changelog}</p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!latest || actionInProgress === plugin.id}
              onClick={() => latest && onInstall(plugin.id, latest.version)}
            >
              {actionInProgress === plugin.id ? 'Updating...' : 'Update'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
