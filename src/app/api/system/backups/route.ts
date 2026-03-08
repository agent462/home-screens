import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'upgrade.sh');

function run(action: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'bash',
      [SCRIPT_PATH, action, ...args],
      { cwd: process.cwd(), timeout: 10000 },
      (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout.trim());
      },
    );
  });
}

export async function GET() {
  try {
    const output = await run('list-backups');
    const backups = JSON.parse(output);
    return NextResponse.json({ backups });
  } catch {
    return NextResponse.json({ backups: [] });
  }
}

export async function POST(request: Request) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = body.name;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing "name"' }, { status: 400 });
  }

  // Validate filename to prevent path traversal
  if (!/^config-v[\d.]+-\d{8}-\d{6}\.json$/.test(name)) {
    return NextResponse.json({ error: 'Invalid backup filename' }, { status: 400 });
  }

  try {
    const output = await run('restore-backup', [name]);
    const result = JSON.parse(output);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Restore failed' },
      { status: 500 },
    );
  }
}
