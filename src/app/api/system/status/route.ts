import { subscribeToProgress, type UpgradeProgress } from '@/lib/upgrade';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      function send(data: UpgradeProgress) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          // Close stream when upgrade is done or errored
          if (data.step === 'complete' || data.step === 'error') {
            setTimeout(() => {
              unsubscribe?.();
              try {
                controller.close();
              } catch {
                // already closed
              }
            }, 100);
          }
        } catch {
          // Stream may be closed by client
        }
      }

      unsubscribe = subscribeToProgress(send);
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
