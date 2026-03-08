export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  return Response.json({
    iso: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    formatted: now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
  });
}
