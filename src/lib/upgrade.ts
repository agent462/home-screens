import { spawn, type ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import { promises as fs } from 'fs';
import path from 'path';
import { readConfig, writeConfig } from './config';
import { migrateUp, getLatestSchemaVersion } from './migrations';

const BUILD_PENDING_PATH = path.join(process.cwd(), 'data', '.build-pending');

type UpgradeStep =
  | 'preflight'
  | 'backup'
  | 'fetch'
  | 'stash'
  | 'checkout'
  | 'install'
  | 'build'
  | 'migrate'
  | 'setup-system'
  | 'restart'
  | 'health-check'
  | 'cleanup'
  | 'complete'
  | 'error';

interface UpgradeProgress {
  step: UpgradeStep;
  progress: number;
  message: string;
  error?: string;
}

/** Discriminated union for SSE events */
export type UpgradeEvent =
  | ({ type: 'progress' } & UpgradeProgress)
  | { type: 'output'; step: UpgradeStep; line: string };

type EventCallback = (event: UpgradeEvent) => void;

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'upgrade.sh');

/** Return the last N non-empty lines of text */
function lastLines(text: string, n: number): string {
  return text
    .split('\n')
    .filter((l) => l.trim())
    .slice(-n)
    .join('\n');
}

/**
 * Spawn upgrade.sh with the given action and stream stdout/stderr
 * line-by-line via the onLine callback.
 */
function runUpgradeScript(
  action: string,
  args: string[] = [],
  onLine?: (line: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [SCRIPT_PATH, action, ...args], {
      cwd: process.cwd(),
    });
    currentUpgrade.childProcess = child;

    let stdout = '';
    let stderr = '';
    let settled = false;

    const settle = () => {
      settled = true;
      currentUpgrade.childProcess = null;
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settle();
        rl.close();
        child.kill();
        reject(new Error(`${action} timed out after 10 minutes`));
      }
    }, 600000);

    // Stream stdout line by line
    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      stdout += line + '\n';
      onLine?.(line);
    });

    // Stream stderr line by line
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split('\n')) {
        if (line.trim()) onLine?.(line);
      }
    });

    child.on('error', (err) => {
      if (!settled) {
        settle();
        clearTimeout(timer);
        reject(new Error(`${action} failed: ${err.message}`));
      }
    });

    child.on('close', (code, signal) => {
      rl.close();
      if (!settled) {
        settle();
        clearTimeout(timer);
        if (signal) {
          // Process was killed by a signal (e.g. OOM killer sends SIGKILL)
          reject(
            new Error(
              `${action} was killed by ${signal}${signal === 'SIGKILL' ? ' (possible out-of-memory)' : ''}`,
            ),
          );
        } else if (code !== 0) {
          // The bash script uses `2>&1` so stderr is often empty — the real
          // error text ends up on stdout. Include stdout tail for context.
          const detail = stderr || lastLines(stdout, 10) || `exit code ${code}`;
          reject(new Error(`${action} failed: ${detail}`));
        } else {
          resolve(stdout.trim());
        }
      }
    });
  });
}

function parseResult(output: string): Record<string, unknown> {
  const lines = output.split('\n');
  const lastLine = lines[lines.length - 1];
  try {
    return JSON.parse(lastLine);
  } catch {
    return { ok: false, error: `Unexpected output: ${output}` };
  }
}

// Global upgrade state — only one upgrade can run at a time
const currentUpgrade: {
  running: boolean;
  cancelled: boolean;
  childProcess: ChildProcess | null;
  progress: UpgradeProgress;
  listeners: Set<EventCallback>;
} = {
  running: false,
  cancelled: false,
  childProcess: null,
  progress: { step: 'complete', progress: 100, message: 'Idle' },
  listeners: new Set(),
};

export function isUpgradeRunning(): boolean {
  return currentUpgrade.running;
}

export function subscribeToEvents(cb: EventCallback): () => void {
  currentUpgrade.listeners.add(cb);
  // Send current state immediately
  cb({ type: 'progress', ...currentUpgrade.progress });
  return () => {
    currentUpgrade.listeners.delete(cb);
  };
}

function emit(progress: UpgradeProgress) {
  currentUpgrade.progress = progress;
  for (const cb of currentUpgrade.listeners) {
    try {
      cb({ type: 'progress', ...progress });
    } catch {
      // ignore listener errors
    }
  }
}

function emitOutput(step: UpgradeStep, line: string) {
  for (const cb of currentUpgrade.listeners) {
    try {
      cb({ type: 'output', step, line });
    } catch {
      // ignore listener errors
    }
  }
}

/** Helper: create an onLine callback that emits output for a given step */
function streamTo(step: UpgradeStep) {
  return (line: string) => emitOutput(step, line);
}

/** Write a marker file indicating a build is pending (checkout done, build not yet complete) */
async function writeBuildPending(tag: string): Promise<void> {
  await fs.writeFile(BUILD_PENDING_PATH, JSON.stringify({ tag, since: new Date().toISOString() }));
}

/** Clear the build-pending marker (build succeeded) */
async function clearBuildPending(): Promise<void> {
  try {
    await fs.unlink(BUILD_PENDING_PATH);
  } catch {
    // File may not exist
  }
}

/** Check if there's a pending (failed) build. Returns the tag or null. */
export async function getBuildPendingTag(): Promise<string | null> {
  try {
    const data = await fs.readFile(BUILD_PENDING_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.tag ?? null;
  } catch {
    return null;
  }
}

interface PipelineStep {
  step: UpgradeStep;
  progress: number;
  message: string;
  run: () => Promise<void>;
}

/** Run an array of pipeline steps sequentially, emitting progress for each */
async function runPipeline(steps: PipelineStep[]): Promise<void> {
  for (const { step, progress, message, run } of steps) {
    emit({ step, progress, message });
    await run();
  }
}

// ─── Step Factories ───
// Reusable builders for common pipeline steps. Each returns a PipelineStep with
// the shared logic baked in; callers only supply progress/message overrides.

function installStep(progress: number, message = 'Installing dependencies...'): PipelineStep {
  return {
    step: 'install',
    progress,
    message,
    run: async () => {
      await runUpgradeScript('install', [], streamTo('install'));
    },
  };
}

function buildStep(progress: number, message = 'Building application...'): PipelineStep {
  return {
    step: 'build',
    progress,
    message,
    run: async () => {
      await runUpgradeScript('build', [], streamTo('build'));
    },
  };
}

function migrateStep(progress: number, extraEmit = false): PipelineStep {
  return {
    step: 'migrate',
    progress,
    message: 'Migrating configuration...',
    run: async () => {
      const config = await readConfig();
      const targetSchemaVersion = getLatestSchemaVersion();
      if ((config.version ?? 0) < targetSchemaVersion) {
        const { config: migrated, migrationsRun } = migrateUp(config, targetSchemaVersion);
        await writeConfig(migrated);
        emitOutput('migrate', `Ran ${migrationsRun.length} migration(s): ${migrationsRun.join(', ')}`);
        if (extraEmit) {
          emit({
            step: 'migrate',
            progress: progress + 5,
            message: `Ran ${migrationsRun.length} migration(s): ${migrationsRun.join(', ')}`,
          });
        }
      } else {
        emitOutput('migrate', 'Schema is up to date — no migration needed');
        if (extraEmit) {
          emit({ step: 'migrate', progress: progress + 5, message: 'No config migration needed' });
        }
      }
    },
  };
}

function setupSystemStep(progress: number): PipelineStep {
  return {
    step: 'setup-system',
    progress,
    message: 'Applying system configuration...',
    run: async () => {
      await runUpgradeScript('setup-system', [], streamTo('setup-system'));
      // Clear marker before restart — the build has provably succeeded at this point,
      // and the restart step may kill the process before 'complete' runs
      await clearBuildPending();
    },
  };
}

function restartStep(progress: number): PipelineStep {
  return {
    step: 'restart',
    progress,
    message: 'Restarting service...',
    run: async () => {
      const restartOut = await runUpgradeScript('restart', [], streamTo('restart'));
      const restart = parseResult(restartOut);
      if (restart.method === 'systemctl') {
        // The delayed nohup restart kills this process ~3s from now, so we
        // cannot run a meaningful health check here (it would just verify the
        // OLD server that's still alive). The client polls for the new server.
        emit({ step: 'health-check', progress: 95, message: 'Server will restart momentarily...' });
        emitOutput('health-check', 'Server restart scheduled — client will reconnect automatically');
      }
    },
  };
}

function completeStep(message: string): PipelineStep {
  return {
    step: 'complete',
    progress: 100,
    message,
    run: async () => {},
  };
}

// ─── Pipeline Guard ───
// Shared try/catch/finally wrapper for pipeline execution. Handles the running
// guard, error emission, optional error-phase cleanup, and the finally block.

interface GuardedPipelineOptions {
  steps: PipelineStep[];
  onError?: () => Promise<void>;
}

async function runGuardedPipeline({ steps, onError }: GuardedPipelineOptions): Promise<void> {
  if (currentUpgrade.running) {
    throw new Error('An upgrade is already in progress');
  }
  currentUpgrade.running = true;
  currentUpgrade.cancelled = false;

  try {
    await runPipeline(steps);
  } catch (error) {
    // Skip emitting if cancelUpgrade() already emitted the error
    if (!currentUpgrade.cancelled) {
      const message = error instanceof Error ? error.message : String(error);
      emit({ step: 'error', progress: 0, message, error: message });
    }

    if (onError) {
      await onError();
    }

    throw error;
  } finally {
    currentUpgrade.running = false;
    currentUpgrade.cancelled = false;
  }
}

/** Cancel a running upgrade — kills the child process and resets state */
export function cancelUpgrade(): boolean {
  if (!currentUpgrade.running) return false;

  const child = currentUpgrade.childProcess;
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }

  currentUpgrade.cancelled = true;

  emit({
    step: 'error',
    progress: 0,
    message: 'Upgrade cancelled by user',
    error: 'Upgrade cancelled by user',
  });

  currentUpgrade.running = false;
  currentUpgrade.childProcess = null;

  return true;
}

// ─── Public Pipeline Functions ───

export async function runUpgrade(targetTag: string): Promise<void> {
  let stashed = false;

  // Shared state across steps
  let isDirty = false;

  const steps: PipelineStep[] = [
    {
      step: 'preflight',
      progress: 5,
      message: 'Running pre-flight checks...',
      run: async () => {
        const preflightOut = await runUpgradeScript('preflight', [], streamTo('preflight'));
        const preflight = parseResult(preflightOut);
        if (!preflight.ok) {
          throw new Error(preflight.error as string);
        }
        isDirty = preflight.dirty as boolean;
      },
    },
    {
      step: 'backup',
      progress: 10,
      message: 'Backing up configuration...',
      run: async () => {
        const backupOut = await runUpgradeScript('backup', [], streamTo('backup'));
        const backup = parseResult(backupOut);
        if (!backup.ok) {
          throw new Error(`Backup failed: ${backup.error}`);
        }
      },
    },
    {
      step: 'fetch',
      progress: 20,
      message: 'Fetching latest code...',
      run: async () => {
        await runUpgradeScript('fetch', [], streamTo('fetch'));
      },
    },
    {
      step: 'stash',
      progress: 25,
      message: 'Stashing local changes...',
      run: async () => {
        if (!isDirty) return;
        const stashOut = await runUpgradeScript('stash', [], streamTo('stash'));
        const stashResult = parseResult(stashOut);
        stashed = (stashResult.stashed as boolean) ?? false;
      },
    },
    {
      step: 'checkout',
      progress: 30,
      message: `Checking out ${targetTag}...`,
      run: async () => {
        const checkoutOut = await runUpgradeScript('checkout', [targetTag], streamTo('checkout'));
        const checkout = parseResult(checkoutOut);
        if (!checkout.ok) {
          throw new Error(`Checkout failed: ${checkout.error}`);
        }
        // Mark build as pending — if anything after this fails, the user can retry
        await writeBuildPending(targetTag);
      },
    },
    installStep(40),
    buildStep(55, 'Building application (this may take a few minutes)...'),
    migrateStep(80, true),
    {
      step: 'cleanup',
      progress: 85,
      message: 'Restoring local changes...',
      run: async () => {
        if (!stashed) return;
        await runUpgradeScript('stash-pop', [], streamTo('cleanup'));
      },
    },
    setupSystemStep(88),
    restartStep(92),
    completeStep(`Upgrade to ${targetTag} complete!`),
  ];

  await runGuardedPipeline({
    steps,
    onError: async () => {
      // Attempt to pop stash even on error
      if (stashed) {
        try {
          await runUpgradeScript('stash-pop');
        } catch (stashErr) {
          const stashMsg = stashErr instanceof Error ? stashErr.message : String(stashErr);
          emitOutput(
            currentUpgrade.progress.step,
            `Warning: failed to restore stashed changes: ${stashMsg}`,
          );
          emitOutput(
            currentUpgrade.progress.step,
            'Your local changes are saved in git stash. Run "git stash pop" manually to recover them.',
          );
        }
      }
    },
  });
}

export async function runRollback(targetTag: string): Promise<void> {
  const steps: PipelineStep[] = [
    {
      step: 'backup',
      progress: 10,
      message: 'Backing up current configuration...',
      run: async () => {
        await runUpgradeScript('backup', [], streamTo('backup'));
      },
    },
    {
      step: 'checkout',
      progress: 30,
      message: `Rolling back to ${targetTag}...`,
      run: async () => {
        await runUpgradeScript('rollback', [targetTag], streamTo('checkout'));
        await writeBuildPending(targetTag);
      },
    },
    installStep(45),
    buildStep(60),
    setupSystemStep(78),
    restartStep(85),
    completeStep(`Rolled back to ${targetTag} successfully!`),
  ];

  await runGuardedPipeline({ steps });
}

export async function runRebuild(): Promise<void> {
  const pendingTag = await getBuildPendingTag();
  if (!pendingTag) {
    throw new Error('No pending build found');
  }

  const steps: PipelineStep[] = [
    installStep(10, 'Verifying dependencies...'),
    buildStep(30, 'Building application (this may take a few minutes)...'),
    migrateStep(70),
    setupSystemStep(80),
    restartStep(90),
    completeStep(`Rebuild for ${pendingTag} complete!`),
  ];

  await runGuardedPipeline({ steps });
}
