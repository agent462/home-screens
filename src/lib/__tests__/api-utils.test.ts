import { describe, it, expect } from 'vitest';
import { errorResponse } from '@/lib/api-utils';

describe('errorResponse', () => {
  it('extracts message from Error instances', async () => {
    const response = errorResponse(new Error('something broke'), 'fallback');
    const json = await response.json();
    expect(json).toEqual({ error: 'something broke' });
  });

  it('uses fallbackMessage for non-Error string', async () => {
    const response = errorResponse('not an error object', 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('uses fallbackMessage for null', async () => {
    const response = errorResponse(null, 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('uses fallbackMessage for undefined', async () => {
    const response = errorResponse(undefined, 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('uses fallbackMessage for a number', async () => {
    const response = errorResponse(42, 'fallback message');
    const json = await response.json();
    expect(json).toEqual({ error: 'fallback message' });
  });

  it('defaults to status 500', () => {
    const response = errorResponse(new Error('fail'), 'fallback');
    expect(response.status).toBe(500);
  });

  it('respects custom status 400', () => {
    const response = errorResponse(new Error('bad request'), 'fallback', 400);
    expect(response.status).toBe(400);
  });

  it('respects custom status 502', () => {
    const response = errorResponse(new Error('bad gateway'), 'fallback', 502);
    expect(response.status).toBe(502);
  });

  it('returns valid JSON response with correct content type', () => {
    const response = errorResponse(new Error('test'), 'fallback');
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
