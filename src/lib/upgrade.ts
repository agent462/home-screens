import { spawn } from 'child_process';
import { createInterface } from 'readline';
import path from 'path';
import { readConfig, writeConfig } from './config';
import { migrateUp, getLatestSchemaVersion } from './migrations';

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

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
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
        settled = true;
        clearTimeout(timer);
        reject(new Error(`${action} failed: ${err.message}`));
      }
    });

    child.on('close', (code, signal) => {
      rl.close();
      if (!settled) {
        settled = true;
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
let currentUpgrade: {
  running: boolean;
  progress: UpgradeProgress;
  listeners: Set<EventCallback>;
} = {
  running: false,
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

export async function runUpgrade(targetTag: string): Promise<void> {
  if (currentUpgrade.running) {
    throw new Error('An upgrade is already in progress');
  }

  currentUpgrade.running = true;
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
      },
    },
    {
      step: 'install',
      progress: 40,
      message: 'Installing dependencies...',
      run: async () => {
        await runUpgradeScript('install', [], streamTo('install'));
      },
    },
    {
      step: 'build',
      progress: 55,
      message: 'Building application (this may take a few minutes)...',
      run: async () => {
        await runUpgradeScript('build', [], streamTo('build'));
      },
    },
    {
      step: 'migrate',
      progress: 80,
      message: 'Migrating configuration...',
      run: async () => {
        const config = await readConfig();
        const targetSchemaVersion = getLatestSchemaVersion();
        if ((config.version ?? 0) < targetSchemaVersion) {
          const { config: migrated, migrationsRun } = migrateUp(config, targetSchemaVersion);
          await writeConfig(migrated);
          emitOutput('migrate', `Ran ${migrationsRun.length} migration(s): ${migrationsRun.join(', ')}`);
          emit({
            step: 'migrate',
            progress: 85,
            message: `Ran ${migrationsRun.length} migration(s): ${migrationsRun.join(', ')}`,
          });
        } else {
          emitOutput('migrate', 'Schema is up to date — no migration needed');
          emit({ step: 'migrate', progress: 85, message: 'No config migration needed' });
        }
      },
    },
    {
      step: 'cleanup',
      progress: 85,
      message: 'Restoring local changes...',
      run: async () => {
        if (!stashed) return;
        await runUpgradeScript('stash-pop', [], streamTo('cleanup'));
      },
    },
    {
      step: 'setup-system',
      progress: 88,
      message: 'Applying system configuration...',
      run: async () => {
        await runUpgradeScript('setup-system', [], streamTo('setup-system'));
      },
    },
    {
      step: 'restart',
      progress: 92,
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
    },
    {
      step: 'complete',
      progress: 100,
      message: `Upgrade to ${targetTag} complete!`,
      run: async () => {},
    },
  ];

  try {
    await runPipeline(steps);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ step: 'error', progress: 0, message, error: message });

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

    throw error;
  } finally {
    currentUpgrade.running = false;
  }
}

export async function runRollback(targetTag: string): Promise<void> {
  if (currentUpgrade.running) {
    throw new Error('An upgrade is already in progress');
  }

  currentUpgrade.running = true;

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
      },
    },
    {
      step: 'install',
      progress: 45,
      message: 'Installing dependencies...',
      run: async () => {
        await runUpgradeScript('install', [], streamTo('install'));
      },
    },
    {
      step: 'build',
      progress: 60,
      message: 'Building application...',
      run: async () => {
        await runUpgradeScript('build', [], streamTo('build'));
      },
    },
    {
      step: 'setup-system',
      progress: 78,
      message: 'Applying system configuration...',
      run: async () => {
        await runUpgradeScript('setup-system', [], streamTo('setup-system'));
      },
    },
    {
      step: 'restart',
      progress: 85,
      message: 'Restarting service...',
      run: async () => {
        const restartOut = await runUpgradeScript('restart', [], streamTo('restart'));
        const restart = parseResult(restartOut);
        if (restart.method === 'systemctl') {
          emit({ step: 'health-check', progress: 95, message: 'Server will restart momentarily...' });
          emitOutput('health-check', 'Server restart scheduled — client will reconnect automatically');
        }
      },
    },
    {
      step: 'complete',
      progress: 100,
      message: `Rolled back to ${targetTag} successfully!`,
      run: async () => {},
    },
  ];

  try {
    await runPipeline(steps);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ step: 'error', progress: 0, message, error: message });
    throw error;
  } finally {
    currentUpgrade.running = false;
  }
}
