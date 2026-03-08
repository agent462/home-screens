import { execFile } from 'child_process';
import path from 'path';
import { readConfig, writeConfig } from './config';
import { migrateUp, getLatestSchemaVersion } from './migrations';

export type UpgradeStep =
  | 'preflight'
  | 'backup'
  | 'fetch'
  | 'stash'
  | 'checkout'
  | 'install'
  | 'build'
  | 'migrate'
  | 'restart'
  | 'health-check'
  | 'cleanup'
  | 'complete'
  | 'error';

export interface UpgradeProgress {
  step: UpgradeStep;
  progress: number;
  message: string;
  error?: string;
}

type ProgressCallback = (progress: UpgradeProgress) => void;

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'upgrade.sh');

function runUpgradeScript(action: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'bash',
      [SCRIPT_PATH, action, ...args],
      { cwd: process.cwd(), timeout: 600000 }, // 10 min for build
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`${action} failed: ${stderr || err.message}`));
        } else {
          resolve(stdout.trim());
        }
      },
    );
  });
}

function parseResult(output: string): Record<string, unknown> {
  // The script outputs JSON on the last line
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
  listeners: Set<ProgressCallback>;
} = {
  running: false,
  progress: { step: 'complete', progress: 100, message: 'Idle' },
  listeners: new Set(),
};

export function isUpgradeRunning(): boolean {
  return currentUpgrade.running;
}

export function getUpgradeProgress(): UpgradeProgress {
  return currentUpgrade.progress;
}

export function subscribeToProgress(cb: ProgressCallback): () => void {
  currentUpgrade.listeners.add(cb);
  // Send current state immediately
  cb(currentUpgrade.progress);
  return () => {
    currentUpgrade.listeners.delete(cb);
  };
}

function emit(progress: UpgradeProgress) {
  currentUpgrade.progress = progress;
  for (const cb of currentUpgrade.listeners) {
    try {
      cb(progress);
    } catch {
      // ignore listener errors
    }
  }
}

export async function runUpgrade(targetTag: string): Promise<void> {
  if (currentUpgrade.running) {
    throw new Error('An upgrade is already in progress');
  }

  currentUpgrade.running = true;
  let stashed = false;

  try {
    // Step 1: Preflight
    emit({ step: 'preflight', progress: 5, message: 'Running pre-flight checks...' });
    const preflightOut = await runUpgradeScript('preflight');
    const preflight = parseResult(preflightOut);
    if (!preflight.ok) {
      throw new Error(preflight.error as string);
    }
    const isDirty = preflight.dirty as boolean;

    // Step 2: Backup config
    emit({ step: 'backup', progress: 10, message: 'Backing up configuration...' });
    const backupOut = await runUpgradeScript('backup');
    const backup = parseResult(backupOut);
    if (!backup.ok) {
      throw new Error(`Backup failed: ${backup.error}`);
    }

    // Step 3: Fetch latest
    emit({ step: 'fetch', progress: 20, message: 'Fetching latest code...' });
    await runUpgradeScript('fetch');

    // Step 4: Stash local changes if dirty
    if (isDirty) {
      emit({ step: 'stash', progress: 25, message: 'Stashing local changes...' });
      const stashOut = await runUpgradeScript('stash');
      const stashResult = parseResult(stashOut);
      stashed = (stashResult.stashed as boolean) ?? false;
    }

    // Step 5: Checkout target version
    emit({ step: 'checkout', progress: 30, message: `Checking out ${targetTag}...` });
    const checkoutOut = await runUpgradeScript('checkout', [targetTag]);
    const checkout = parseResult(checkoutOut);
    if (!checkout.ok) {
      throw new Error(`Checkout failed: ${checkout.error}`);
    }

    // Step 6: Install dependencies
    emit({ step: 'install', progress: 40, message: 'Installing dependencies...' });
    await runUpgradeScript('install');

    // Step 7: Build
    emit({ step: 'build', progress: 55, message: 'Building application (this may take a few minutes)...' });
    await runUpgradeScript('build');

    // Step 8: Run config migrations
    emit({ step: 'migrate', progress: 80, message: 'Migrating configuration...' });
    const config = await readConfig();
    const targetSchemaVersion = getLatestSchemaVersion();
    if ((config.version ?? 0) < targetSchemaVersion) {
      const { config: migrated, migrationsRun } = migrateUp(config, targetSchemaVersion);
      await writeConfig(migrated);
      emit({
        step: 'migrate',
        progress: 85,
        message: `Ran ${migrationsRun.length} migration(s): ${migrationsRun.join(', ')}`,
      });
    } else {
      emit({ step: 'migrate', progress: 85, message: 'No config migration needed' });
    }

    // Step 9: Pop stash if we stashed
    if (stashed) {
      emit({ step: 'cleanup', progress: 87, message: 'Restoring local changes...' });
      await runUpgradeScript('stash-pop');
    }

    // Step 10: Restart service
    emit({ step: 'restart', progress: 90, message: 'Restarting service...' });
    const restartOut = await runUpgradeScript('restart');
    const restart = parseResult(restartOut);

    if (restart.method === 'systemctl') {
      // Step 11: Health check
      emit({ step: 'health-check', progress: 95, message: 'Waiting for server to come back online...' });
      await runUpgradeScript('health-check');
    }

    // Done
    emit({ step: 'complete', progress: 100, message: `Upgrade to ${targetTag} complete!` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ step: 'error', progress: 0, message, error: message });

    // Attempt to pop stash even on error
    if (stashed) {
      try {
        await runUpgradeScript('stash-pop');
      } catch {
        // ignore
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

  try {
    emit({ step: 'backup', progress: 10, message: 'Backing up current configuration...' });
    await runUpgradeScript('backup');

    emit({ step: 'checkout', progress: 30, message: `Rolling back to ${targetTag}...` });
    await runUpgradeScript('rollback', [targetTag]);

    emit({ step: 'install', progress: 45, message: 'Installing dependencies...' });
    await runUpgradeScript('install');

    emit({ step: 'build', progress: 60, message: 'Building application...' });
    await runUpgradeScript('build');

    emit({ step: 'restart', progress: 85, message: 'Restarting service...' });
    const restartOut = await runUpgradeScript('restart');
    const restart = parseResult(restartOut);

    if (restart.method === 'systemctl') {
      emit({ step: 'health-check', progress: 95, message: 'Waiting for server...' });
      await runUpgradeScript('health-check');
    }

    emit({ step: 'complete', progress: 100, message: `Rolled back to ${targetTag} successfully!` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ step: 'error', progress: 0, message, error: message });
    throw error;
  } finally {
    currentUpgrade.running = false;
  }
}
