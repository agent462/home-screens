import { useState, useEffect, useRef, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressData {
  step: string;
  progress: number;
  message: string;
  error?: string;
}

export type StepState = 'done' | 'active' | 'pending' | 'error';

export interface UpgradeStreamState {
  progress: ProgressData;
  started: boolean;
  done: boolean;
  failed: boolean;
  activeStep: string;
  visitedSteps: Set<string>;
  stepLogs: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Step state derivation (pure function)
// ---------------------------------------------------------------------------

export function getStepState(
  step: string,
  steps: readonly string[],
  activeStep: string,
  done: boolean,
  failed: boolean,
  visitedSteps: Set<string>,
): StepState {
  const stepIdx = steps.indexOf(step);
  const activeIdx = steps.indexOf(activeStep);

  // Only mark steps as done if they were actually visited (fixes rollback
  // showing all steps green even when preflight/fetch/migrate were skipped)
  if (done) return visitedSteps.has(step) ? 'done' : 'pending';

  // If activeStep is not in the visible steps list (e.g. internal-only steps
  // like 'stash'), fall back to visitedSteps to determine state
  if (activeIdx === -1) {
    return visitedSteps.has(step) ? 'done' : 'pending';
  }

  if (failed && stepIdx === activeIdx) return 'error';
  if (stepIdx < activeIdx) return 'done';
  if (stepIdx === activeIdx && !failed) return 'active';
  return 'pending';
}

// ---------------------------------------------------------------------------
// Step labels (shared constant)
// ---------------------------------------------------------------------------

export const STEP_LABELS: Record<string, string> = {
  preflight: 'Pre-flight checks',
  backup: 'Back up configuration',
  download: 'Download update',
  migrate: 'Migrate configuration',
  deploy: 'Install update',
  'setup-system': 'Apply system configuration',
  restart: 'Restart service',
  cleanup: 'Finalize',
  // Legacy git-based steps (shown for fallback upgrades)
  fetch: 'Download latest code',
  checkout: 'Switch to new version',
  install: 'Install dependencies',
  build: 'Build application',
};

// ---------------------------------------------------------------------------
// useUpgradeStream — SSE connection + upgrade trigger
// ---------------------------------------------------------------------------

export function useUpgradeStream(
  steps: readonly string[],
  targetTag: string,
  isRollback: boolean,
): UpgradeStreamState {
  const firstStep = steps[0];

  const [progress, setProgress] = useState<ProgressData>({
    step: firstStep,
    progress: 0,
    message: 'Starting...',
  });
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  // Track the last real step (not 'error' or 'complete')
  const [activeStep, setActiveStep] = useState(firstStep);
  // Track which steps were actually visited (for rollback correctness)
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(new Set([firstStep]));
  // Per-step accumulated log output
  const [stepLogs, setStepLogs] = useState<Record<string, string>>({});

  const progressRef = useRef(progress);
  const activeStepRef = useRef(activeStep);
  progressRef.current = progress;
  activeStepRef.current = activeStep;

  // Track visited steps whenever activeStep changes
  useEffect(() => {
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      next.add(activeStep);
      return next;
    });
  }, [activeStep]);

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
            steps.includes(data.step)
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
        current.step === 'cleanup' ||
        currentActive === 'restart' ||
        currentActive === 'cleanup'
      ) {
        // SSE connection lost during restart/cleanup — expected, the server is restarting
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

  return { progress, started, done, failed, activeStep, visitedSteps, stepLogs };
}

// ---------------------------------------------------------------------------
// useWaitForServer — poll for server availability after upgrade completes
// ---------------------------------------------------------------------------

export function useWaitForServer(done: boolean): string | null {
  const [reloadStatus, setReloadStatus] = useState<string | null>(null);

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
          // Poll /api/system/version which returns { upgradeRunning }.
          // The OLD server (still alive during nohup delay) returns
          // upgradeRunning: true. The NEW server starts fresh with
          // upgradeRunning: false — so we only reload once the new
          // server is confirmed ready.
          const res = await fetch('/api/system/version', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (!data.upgradeRunning) {
              setReloadStatus('Reloading...');
              window.location.reload();
              return;
            }
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

  return reloadStatus;
}

// ---------------------------------------------------------------------------
// useAccordionState — manage expanded/collapsed step panels
// ---------------------------------------------------------------------------

export function useAccordionState(activeStep: string) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([activeStep]));
  const prevActiveRef = useRef(activeStep);

  // Track visited steps + auto-expand active, collapse previous
  useEffect(() => {
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

  return { expanded, toggleExpand };
}
