import { readConfig } from '@/lib/config';
import type { ChoreChartConfig } from '@/types/config';
import ChoresClient from './ChoresClient';

export const dynamic = 'force-dynamic';

export default async function ChoresPage() {
  const config = await readConfig();

  // Find the first chore-chart module across all screens
  let choreConfig: ChoreChartConfig | null = null;
  for (const screen of config.screens) {
    for (const mod of screen.modules) {
      if (mod.type === 'chore-chart') {
        choreConfig = mod.config as unknown as ChoreChartConfig;
        break;
      }
    }
    if (choreConfig) break;
  }

  if (!choreConfig || !choreConfig.members?.length || !choreConfig.chores?.length) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">&#128203;</div>
          <h1 className="text-lg font-semibold">No Chore Chart Found</h1>
          <p className="text-sm text-neutral-400">
            Add a Chore Chart module with members and chores in the editor first.
          </p>
        </div>
      </div>
    );
  }

  return <ChoresClient config={choreConfig} />;
}
