'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import Button from '@/components/ui/Button';

interface ProgressData {
  step: string;
  progress: number;
  message: string;
  error?: string;
}

/** Steps shown in the accordion (stash/cleanup are internal) */
const VISIBLE_STEPS = [
  'preflight',
  'backup',
  'fetch',
  'checkout',
  'install',
  'build',
  'migrate',
  'setup-system',
  'restart',
  'health-check',
] as const;

const STEP_LABELS: Record<string, string> = {
  preflight: 'Pre-flight checks',
  backup: 'Back up configuration',
  fetch: 'Download latest code',
  checkout: 'Switch to new version',
  install: 'Install dependencies',
  build: 'Build application',
  migrate: 'Migrate configuration',
  'setup-system': 'Apply system configuration',
  restart: 'Restart service',
  'health-check': 'Verify server health',
};

type StepState = 'done' | 'active' | 'pending' | 'error';

const STEP_STYLES: Record<StepState, { icon: React.ReactNode; textClass: string }> = {
  done: {
    icon: <span className="text-green-400 text-xs">&#10003;</span>,
    textClass: 'text-neutral-500',
  },
  active: {
    icon: <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />,
    textClass: 'text-neutral-100',
  },
  error: {
    icon: <span className="text-red-400 text-xs font-bold">&#10005;</span>,
    textClass: 'text-red-400',
  },
  pending: {
    icon: <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-700" />,
    textClass: 'text-neutral-600',
  },
};

interface Props {
  targetTag: string;
  isRollback: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export default function UpgradeModal({ targetTag, isRollback, onComplete, onClose }: Props) {
  const [progress, setProgress] = useState<ProgressData>({
    step: 'preflight',
    progress: 0,
    message: 'Starting...',
  });
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<string | null>(null);

  // Track the last real step (not 'error' or 'complete')
  const [activeStep, setActiveStep] = useState('preflight');
  // Track which steps were actually visited (for rollback correctness)
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(new Set(['preflight']));
  // Per-step accumulated log output
  const [stepLogs, setStepLogs] = useState<Record<string, string>>({});
  // Which accordion panels are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['preflight']));

  const activeLogRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const activeStepRef = useRef(activeStep);
  progressRef.current = progress;
  activeStepRef.current = activeStep;

  // Auto-scroll the active step's output to the bottom
  useEffect(() => {
    if (activeLogRef.current) {
      activeLogRef.current.scrollTop = activeLogRef.current.scrollHeight;
    }
  }, [stepLogs, activeStep]);

  // Track visited steps + auto-expand active, collapse previous
  const prevActiveRef = useRef(activeStep);
  useEffect(() => {
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      next.add(activeStep);
      return next;
    });

    if (activeStep !== prevActiveRef.current) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(prevActiveRef.current);
        next.add(activeStep);
        return next;
      });
      prevActiveRef.current = activeStep;
    }
  }, [activeStep]);

  const toggleExpand = useCallback((step: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  }, []);

  // Connect SSE and trigger upgrade
  useEffect(() => {
    if (started) return;
    setStarted(true);

    const es = new EventSource('/api/system/status');

    // Progress events — step transitions
    es.addEventListener(
      'progress',
      ((event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as ProgressData & { type: string };
          setProgress({
            step: data.step,
            progress: data.progress,
            message: data.message,
            error: data.error,
          });

          if (
            data.step !== 'error' &&
            data.step !== 'complete' &&
            (VISIBLE_STEPS as readonly string[]).includes(data.step)
          ) {
            // Only update activeStep for visible steps — hidden steps like
            // 'stash'/'cleanup' would make indexOf return -1 and break the
            // accordion state.
            setActiveStep(data.step);
          }

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
      }) as EventListener,
    );

    // Output events — streaming log lines
    es.addEventListener(
      'output',
      ((event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as { step: string; line: string };
          setStepLogs((prev) => ({
            ...prev,
            [data.step]: (prev[data.step] || '') + data.line + '\n',
          }));
        } catch {
          // ignore parse errors
        }
      }) as EventListener,
    );

    es.onerror = () => {
      es.close();
      const current = progressRef.current;
      const currentActive = activeStepRef.current;

      if (
        current.step === 'restart' ||
        current.step === 'health-check' ||
        currentActive === 'restart' ||
        currentActive === 'health-check'
      ) {
        // SSE connection lost during restart — expected, the server is restarting
        setProgress({
          step: 'complete',
          progress: 100,
          message: 'Server restarted. Reconnecting...',
        });
        setDone(true);
      } else if (current.step !== 'complete' && current.step !== 'error') {
        // Unexpected disconnect — show error so the UI doesn't freeze
        const stepLabel = STEP_LABELS[currentActive] || currentActive;
        setFailed(true);
        setProgress({
          step: 'error',
          progress: 0,
          message: `Connection lost during "${stepLabel}"`,
          error:
            'The server connection was lost unexpectedly. The upgrade may still be running — check server logs and try refreshing the page.',
        });
      }
    };

    // Trigger the upgrade/rollback
    const endpoint = isRollback ? '/api/system/rollback' : '/api/system/upgrade';
    editorFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: targetTag }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          es.close();
          setFailed(true);
          setProgress({
            step: 'error',
            progress: 0,
            message: 'Failed to start upgrade',
            error: body.error || `Server returned ${res.status}`,
          });
        }
      })
      .catch(() => {
        es.close();
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

  // After upgrade completes, poll for the server to be ready before reloading.
  // The systemctl restart fires ~3s after the upgrade finishes, so we wait past
  // that window then poll until the (new) server responds.
  useEffect(() => {
    if (!done) return;
    let cancelled = false;

    async function waitForServer() {
      setReloadStatus('Waiting for server to restart...');
      // Wait past the nohup restart delay (3s) plus buffer
      await new Promise((r) => setTimeout(r, 4000));

      setReloadStatus('Waiting for new server...');
      const deadline = Date.now() + 60000; // 60s max wait
      while (!cancelled && Date.now() < deadline) {
        try {
          const res = await fetch('/api/config', { cache: 'no-store' });
          if (res.ok) {
            setReloadStatus('Reloading...');
            window.location.reload();
            return;
          }
        } catch {
          // Server not ready yet
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Fallback: reload anyway after timeout
      if (!cancelled) {
        window.location.reload();
      }
    }

    waitForServer();
    return () => {
      cancelled = true;
    };
  }, [done]);

  function getStepState(step: string): StepState {
    const stepIdx = VISIBLE_STEPS.indexOf(step as (typeof VISIBLE_STEPS)[number]);
    const activeIdx = VISIBLE_STEPS.indexOf(activeStep as (typeof VISIBLE_STEPS)[number]);

    // Only mark steps as done if they were actually visited (fixes rollback
    // showing all steps green even when preflight/fetch/migrate were skipped)
    if (done) return visitedSteps.has(step) ? 'done' : 'pending';
    if (failed && stepIdx === activeIdx) return 'error';
    if (stepIdx < activeIdx) return 'done';
    if (stepIdx === activeIdx && !failed) return 'active';
    return 'pending';
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-neutral-100">
            {isRollback ? 'Rolling back' : 'Upgrading'} to {targetTag}
          </h2>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Overall progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-neutral-400 truncate mr-2">{progress.message}</span>
              <span className="text-xs text-neutral-500 font-mono flex-shrink-0">
                {progress.progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  failed ? 'bg-red-500' : done ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>

          {/* Accordion step list */}
          <div className="space-y-1">
            {VISIBLE_STEPS.map((step) => {
              const state = getStepState(step);
              const styles = STEP_STYLES[state] ?? STEP_STYLES.pending;
              const isOpen = expanded.has(step);
              const log = stepLogs[step] || '';
              const hasLog = log.length > 0;
              const canExpand = hasLog && state !== 'pending';

              return (
                <div
                  key={step}
                  className={`rounded-lg overflow-hidden border transition-colors ${
                    state === 'active'
                      ? 'border-blue-500/30 bg-neutral-800/20'
                      : state === 'error'
                        ? 'border-red-500/30 bg-red-950/10'
                        : 'border-neutral-800/50'
                  }`}
                >
                  <button
                    disabled={!canExpand}
                    onClick={() => toggleExpand(step)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                      canExpand ? 'cursor-pointer hover:bg-neutral-800/30' : 'cursor-default'
                    }`}
                  >
                    <span className="w-4 flex-shrink-0 text-center">
                      {styles.icon}
                    </span>
                    <span className={`flex-1 ${styles.textClass}`}>
                      {STEP_LABELS[step] ?? step}
                    </span>
                    {canExpand && (
                      <span className="text-neutral-600 text-[10px]">{isOpen ? '▾' : '▸'}</span>
                    )}
                  </button>

                  {isOpen && hasLog && (
                    <div
                      ref={state === 'active' || state === 'error' ? activeLogRef : undefined}
                      className="border-t border-neutral-800/50 bg-black/40 max-h-48 overflow-y-auto"
                    >
                      <pre className="px-3 py-2 text-[11px] leading-relaxed font-mono text-neutral-500 whitespace-pre-wrap break-all">
                        {log}
                      </pre>
                    </div>
                  )}
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

          {/* Success — polling for server */}
          {done && (
            <p className="text-xs text-green-400 text-center">
              {reloadStatus || 'Upgrade complete!'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-neutral-700 flex-shrink-0">
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
