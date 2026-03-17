import { NextRequest, NextResponse } from 'next/server';
import { getSecretStatus, setSecret, deleteSecret, isValidSecretKey } from '@/lib/secrets';
import { requireSession } from '@/lib/auth';
import { errorResponse, validateTodoistToken } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const status = await getSecretStatus();
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to read secret status');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireSession(request);
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
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to save secret');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSession(request);
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
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to delete secret');
  }
}
