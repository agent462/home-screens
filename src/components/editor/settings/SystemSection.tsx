'use client';

import { useState, useEffect, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import Button from '@/components/ui/Button';
import { useConfirmStore } from '@/stores/confirm-store';

interface TagInfo {
  tag: string;
  version: string;
  commit: string;
}

interface VersionInfo {
  current: string;
  currentCommit: string;
  latest: string | null;
  updateAvailable: boolean;
  installedVia: 'git' | 'unknown';
  channel: string;
  tags: TagInfo[];
  buildPending: boolean;
  buildPendingTag: string | null;
  upgradeRunning: boolean;
}

interface Release {
  tag: string;
  name: string;
  body: string;
  published: string | null;
}

interface BackupFile {
  name: string;
  size: number;
  modified: string;
}

type PowerState =
  | { status: 'idle' }
  | { status: 'pending'; action: string }
  | { status: 'ok'; action: string }
  | { status: 'error'; message: string };

interface Props {
  onUpgrade: (tag: string) => void;
  onRollback: (tag: string) => void;
  onRebuild: () => void;
}

export default function SystemSection({ onUpgrade, onRollback, onRebuild }: Props) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [powerState, setPowerState] = useState<PowerState>({ status: 'idle' });

  const fetchAll = useCallback(async (forceCheck = false) => {
    try {
      const params = forceCheck ? '?check=true' : '';
      const [vRes, bRes] = await Promise.all([
        editorFetch(`/api/system/version${params}`),
        editorFetch('/api/system/backups'),
      ]);

      if (vRes.ok) {
        const data = await vRes.json();
        setVersionInfo(data);
      }
      if (bRes.ok) {
        const data = await bRes.json();
        setBackups(data.backups ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, []);

  const fetchChangelog = useCallback(async () => {
    try {
      const res = await editorFetch('/api/system/changelog');
      if (res.ok) {
        const data = await res.json();
        setReleases(data.releases ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function handleCheckUpdates() {
    setChecking(true);
    fetchAll(true);
  }

  async function handleRestoreBackup(name: string) {
    if (!(await useConfirmStore.getState().confirm({
      title: 'Restore Backup',
      message: `Restore configuration from ${name}? Current config will be overwritten.`,
      confirmLabel: 'Restore',
    }))) return;
    setRestoreStatus('Restoring...');
    try {
      const res = await editorFetch('/api/system/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setRestoreStatus('Restored! Reload the editor to see changes.');
      } else {
        const data = await res.json();
        setRestoreStatus(`Error: ${data.error}`);
      }
    } catch {
      setRestoreStatus('Failed to restore backup');
    }
  }

  async function handleUpgrade(tag: string) {
    if (!(await useConfirmStore.getState().confirm({
      title: 'Upgrade',
      message: `Upgrade to ${tag}? The server will restart and you may briefly lose connection.`,
      confirmLabel: 'Upgrade',
      variant: 'primary',
    }))) return;
    onUpgrade(tag);
  }

  async function handleRollback(tag: string) {
    if (!(await useConfirmStore.getState().confirm({
      title: 'Rollback',
      message: `Roll back to ${tag}? The server will restart.`,
      confirmLabel: 'Roll Back',
    }))) return;
    onRollback(tag);
  }

  async function handlePowerAction(action: 'reboot' | 'restart-service') {
    const label = action === 'reboot' ? 'reboot the system' : 'restart the service';
    if (!(await useConfirmStore.getState().confirm({
      title: action === 'reboot' ? 'Reboot System' : 'Restart Service',
      message: `Are you sure you want to ${label}? You may briefly lose connection.`,
      confirmLabel: action === 'reboot' ? 'Reboot' : 'Restart',
    }))) return;

    setPowerState({ status: 'pending', action });
    try {
      const res = await editorFetch('/api/system/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setPowerState({ status: 'ok', action });
      } else {
        const data = await res.json();
        setPowerState({ status: 'error', message: data.error || 'Unknown error' });
      }
    } catch {
      setPowerState({ status: 'error', message: 'Failed to reach server' });
    }
  }

  async function handleCancelUpgrade() {
    if (!(await useConfirmStore.getState().confirm({
      title: 'Cancel Upgrade',
      message: 'Are you sure? The running upgrade will be killed. You may need to retry or rebuild afterwards.',
      confirmLabel: 'Cancel Upgrade',
    }))) return;
    try {
      const res = await editorFetch('/api/system/upgrade', { method: 'DELETE' });
      if (res.ok) {
        fetchAll();
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-neutral-500 py-8 text-center">
        Loading system info...
      </div>
    );
  }

  if (!versionInfo) {
    return (
      <div className="text-sm text-red-400 py-8 text-center">
        Failed to load system information
      </div>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-neutral-600 [&>section]:py-5 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
      {/* Current Version */}
      <section>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          Version
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-neutral-100 font-mono text-sm">
              v{versionInfo.current}
              <span className="text-neutral-500 ml-2">({versionInfo.currentCommit})</span>
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {versionInfo.installedVia === 'git'
                ? `Branch: ${versionInfo.channel}`
                : 'Not installed via git'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCheckUpdates}
            disabled={checking || versionInfo.installedVia !== 'git'}
          >
            {checking ? 'Checking...' : 'Check for Updates'}
          </Button>
        </div>

        {versionInfo.upgradeRunning && (
          <div className="mt-3 rounded-lg bg-yellow-950/50 border border-yellow-800/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-300 font-medium">
                  Upgrade in progress
                </p>
                <p className="text-xs text-yellow-400/70 mt-0.5">
                  An upgrade is currently running. If it appears stuck, you can cancel it.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelUpgrade}
              >
                Cancel Upgrade
              </Button>
            </div>
          </div>
        )}

        {versionInfo.buildPending && (
          <div className="mt-3 rounded-lg bg-red-950/50 border border-red-800/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-300 font-medium">
                  Build failed for {versionInfo.buildPendingTag}
                </p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  Code was checked out but the build did not complete successfully.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={onRebuild}
              >
                Retry Build
              </Button>
            </div>
          </div>
        )}

        {versionInfo.updateAvailable && versionInfo.latest && (
          <div className="mt-3 rounded-lg bg-blue-950/50 border border-blue-800/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300 font-medium">
                  Update available: v{versionInfo.latest}
                </p>
                <p className="text-xs text-blue-400/70 mt-0.5">
                  You are on v{versionInfo.current}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleUpgrade(`v${versionInfo.latest}`)}
              >
                Update Now
              </Button>
            </div>
          </div>
        )}

        {!versionInfo.buildPending && !versionInfo.updateAvailable && versionInfo.installedVia === 'git' && (
          <p className="text-xs text-green-400/80 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            You&apos;re on the latest version
          </p>
        )}

        {versionInfo.installedVia !== 'git' && (
          <p className="text-xs text-yellow-400/80 mt-2">
            Auto-upgrade requires a git-based installation.
          </p>
        )}
      </section>

      {/* Changelog */}
      {versionInfo.installedVia === 'git' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wider">
              Changelog
            </h3>
            {!showChangelog && (
              <button
                onClick={() => { setShowChangelog(true); fetchChangelog(); }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View Changelog
              </button>
            )}
          </div>

          {showChangelog && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {releases.length === 0 ? (
                <p className="text-xs text-neutral-500">No releases found on GitHub.</p>
              ) : (
                releases.map((r) => (
                  <div key={r.tag} className="rounded-md bg-neutral-800 border border-neutral-700 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-200 font-mono">{r.tag}</span>
                      {r.published && (
                        <span className="text-xs text-neutral-500">
                          {new Date(r.published).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {r.body && (
                      <p className="text-xs text-neutral-400 mt-1 whitespace-pre-line line-clamp-3">
                        {r.body}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      )}

      {/* Version History / Rollback */}
      {versionInfo.tags.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
            Version History
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {versionInfo.tags.map((t) => {
              const isCurrent = t.version === versionInfo.current;
              return (
                <div
                  key={t.tag}
                  className="flex items-center justify-between rounded-md px-3 py-2 bg-neutral-800/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-200 font-mono">{t.tag}</span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded">
                        current
                      </span>
                    )}
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => handleRollback(t.tag)}
                      className="text-xs text-neutral-500 hover:text-orange-400 transition-colors"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Config Backups */}
      <section>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          Config Backups
        </h3>
        {backups.length === 0 ? (
          <p className="text-xs text-neutral-500">
            No backups yet. Backups are created automatically before each upgrade.
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {backups.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between rounded-md px-3 py-2 bg-neutral-800/50"
              >
                <div>
                  <span className="text-xs text-neutral-300 font-mono">{b.name}</span>
                  <span className="text-xs text-neutral-500 ml-2">
                    {(b.size / 1024).toFixed(1)}KB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/system/backups?download=${encodeURIComponent(b.name)}`}
                    download={b.name}
                    className="text-xs text-neutral-500 hover:text-blue-400 transition-colors"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => handleRestoreBackup(b.name)}
                    className="text-xs text-neutral-500 hover:text-blue-400 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {restoreStatus && (
          <p className={`text-xs mt-2 ${restoreStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {restoreStatus}
          </p>
        )}
      </section>

      {/* System Actions */}
      <section>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          System Actions
        </h3>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePowerAction('restart-service')}
            disabled={powerState.status !== 'idle'}
          >
            Restart Service
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handlePowerAction('reboot')}
            disabled={powerState.status !== 'idle'}
          >
            Reboot System
          </Button>
        </div>
        {powerState.status === 'ok' && powerState.action === 'restart-service' && (
          <p className="text-xs text-green-400 mt-2">
            Service restart scheduled. The page will reload momentarily...
          </p>
        )}
        {powerState.status === 'ok' && powerState.action === 'reboot' && (
          <p className="text-xs text-green-400 mt-2">
            System reboot scheduled. The display will come back online shortly...
          </p>
        )}
        {powerState.status === 'error' && (
          <p className="text-xs text-red-400 mt-2">
            {powerState.message}
          </p>
        )}
        {powerState.status === 'pending' && (
          <p className="text-xs text-neutral-500 mt-2">Processing...</p>
        )}
        <p className="text-xs text-neutral-500 mt-2">
          Restart Service reloads the app. Reboot System restarts the entire Raspberry Pi.
        </p>
      </section>
    </div>
  );
}
