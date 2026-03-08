'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';

interface UpgradeProgress {
  step: string;
  progress: number;
  message: string;
  error?: string;
}

const STEP_ORDER = [
  'preflight',
  'backup',
  'fetch',
  'stash',
  'checkout',
  'install',
  'build',
  'migrate',
  'cleanup',
  'restart',
  'health-check',
  'complete',
];

const STEP_LABELS: Record<string, string> = {
  preflight: 'Pre-flight checks',
  backup: 'Back up configuration',
  fetch: 'Download latest code',
  stash: 'Stash local changes',
  checkout: 'Switch to new version',
  install: 'Install dependencies',
  build: 'Build application',
  migrate: 'Migrate configuration',
  cleanup: 'Restore local changes',
  restart: 'Restart service',
  'health-check': 'Verify server health',
  complete: 'Complete',
};

interface Props {
  targetTag: string;
  isRollback: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export default function UpgradeModal({ targetTag, isRollback, onComplete, onClose }: Props) {
  const [progress, setProgress] = useState<UpgradeProgress>({
    step: 'preflight',
    progress: 0,
    message: 'Starting...',
  });
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    if (started) return;
    setStarted(true);

    // Connect SSE first, then trigger the upgrade
    const es = new EventSource('/api/system/status');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: UpgradeProgress = JSON.parse(event.data);
        setProgress(data);

        if (data.step === 'complete') {
          setDone(true);
          es.close();
        } else if (data.step === 'error') {
          setFailed(true);
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE connection lost — might be because server restarted
      es.close();
      // Use ref to read the latest progress value (not the stale closure)
      const current = progressRef.current;
      if (current.step === 'restart' || current.step === 'health-check') {
        setProgress({
          step: 'complete',
          progress: 100,
          message: 'Server restarted. Reconnecting...',
        });
        setDone(true);
      }
    };

    // Trigger the upgrade/rollback
    const endpoint = isRollback ? '/api/system/rollback' : '/api/system/upgrade';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: targetTag }),
    }).catch(() => {
      setFailed(true);
      setProgress({
        step: 'error',
        progress: 0,
        message: 'Failed to start upgrade',
        error: 'Could not connect to server',
      });
    });

    return () => {
      es.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStepIndex = STEP_ORDER.indexOf(progress.step);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-100">
            {isRollback ? 'Rolling back' : 'Upgrading'} to {targetTag}
          </h2>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-neutral-400">{progress.message}</span>
              <span className="text-xs text-neutral-500 font-mono">{progress.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  failed ? 'bg-red-500' : done ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>

          {/* Step list */}
          <div className="space-y-1">
            {STEP_ORDER.filter((s) => s !== 'stash' && s !== 'cleanup').map((step) => {
              const stepIndex = STEP_ORDER.indexOf(step);
              const isActive = step === progress.step;
              const isDone = stepIndex < currentStepIndex || done;
              const isPending = stepIndex > currentStepIndex && !done;
              const isError = failed && isActive;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded text-sm ${
                    isActive ? 'bg-neutral-800/50' : ''
                  }`}
                >
                  <span className="w-4 text-center flex-shrink-0">
                    {isError ? (
                      <span className="text-red-400 text-xs">&#10005;</span>
                    ) : isDone ? (
                      <span className="text-green-400 text-xs">&#10003;</span>
                    ) : isActive ? (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    ) : isPending ? (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    ) : null}
                  </span>
                  <span
                    className={
                      isError
                        ? 'text-red-400'
                        : isDone
                          ? 'text-neutral-400'
                          : isActive
                            ? 'text-neutral-200'
                            : 'text-neutral-600'
                    }
                  >
                    {STEP_LABELS[step] ?? step}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error detail */}
          {failed && progress.error && (
            <div className="rounded-md bg-red-950/50 border border-red-800/50 p-3">
              <p className="text-xs text-red-300 font-mono break-all">{progress.error}</p>
            </div>
          )}

          {/* Warning */}
          {!done && !failed && (
            <p className="text-xs text-yellow-500/70 text-center">
              Do not close this page or power off the device
            </p>
          )}

          {/* Success */}
          {done && (
            <p className="text-xs text-green-400 text-center">
              The page will reload automatically...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-neutral-700">
          {done && (
            <Button variant="primary" onClick={onComplete}>
              Done
            </Button>
          )}
          {failed && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
