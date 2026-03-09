import { NextRequest, NextResponse } from 'next/server';
import { spawn, execSync } from 'child_process';

/**
 * POST /api/system/power
 * Body: { action: "reboot" | "restart-service" }
 *
 * Both actions use a short delay so the API can respond before the process dies.
 */
export async function POST(request: NextRequest) {
  const { action } = await request.json();

  if (action === 'restart-service') {
    return restartService();
  }

  if (action === 'reboot') {
    return rebootSystem();
  }

  return NextResponse.json({ error: 'Invalid action. Use "reboot" or "restart-service".' }, { status: 400 });
}

function restartService(): NextResponse {
  try {
    // Check if the service is managed by systemd
    const result = isSystemdService();
    if (!result) {
      return NextResponse.json(
        { ok: false, error: 'Service not managed by systemd. Restart manually.' },
        { status: 400 },
      );
    }

    // Schedule restart with a short delay so the response can be sent first
    spawn('bash', ['-c', 'sleep 2 && sudo systemctl restart home-screens'], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    return NextResponse.json({ ok: true, message: 'Service restart scheduled' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function rebootSystem(): NextResponse {
  try {
    // Schedule reboot with a short delay so the response can be sent first
    spawn('bash', ['-c', 'sleep 2 && sudo reboot'], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    return NextResponse.json({ ok: true, message: 'System reboot scheduled' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function isSystemdService(): boolean {
  try {
    execSync('systemctl is-active home-screens', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
