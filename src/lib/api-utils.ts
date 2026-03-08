import { NextResponse } from 'next/server';

/**
 * Standardized error response for API routes.
 * Extracts message from Error instances, falls back to provided default.
 */
export function errorResponse(
  error: unknown,
  fallbackMessage: string,
  status = 500,
): NextResponse {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status });
}
