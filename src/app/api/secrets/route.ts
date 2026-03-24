import { NextResponse } from 'next/server';
import { getSecretStatus, setSecret, deleteSecret, isValidSecretKey } from '@/lib/secrets';
import { withAuth, validateTodoistToken } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  const status = await getSecretStatus();
  return NextResponse.json(status);
}, 'Failed to read secret status');

export const PUT = withAuth(async (request) => {
  const body = await request.json();
  const { key, value } = body as { key?: string; value?: string };

  if (!key || typeof value !== 'string' || !value.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: key, value' },
      { status: 400 },
    );
  }

  if (!isValidSecretKey(key)) {
    return NextResponse.json(
      { error: `Invalid secret key: ${key}` },
      { status: 400 },
    );
  }

  // Validate Todoist token before saving
  if (key === 'todoist_token') {
    const result = await validateTodoistToken(value);
    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid Todoist token — API returned ' + result.status },
        { status: 401 },
      );
    }
  }

  await setSecret(key, value);
  return NextResponse.json({ ok: true });
}, 'Failed to save secret');

export const DELETE = withAuth(async (request) => {
  const body = await request.json();
  const { key } = body as { key?: string };

  if (!key) {
    return NextResponse.json(
      { error: 'Missing required field: key' },
      { status: 400 },
    );
  }

  if (!isValidSecretKey(key)) {
    return NextResponse.json(
      { error: `Invalid secret key: ${key}` },
      { status: 400 },
    );
  }

  await deleteSecret(key);
  return NextResponse.json({ ok: true });
}, 'Failed to delete secret');
