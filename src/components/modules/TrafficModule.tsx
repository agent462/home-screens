'use client';

import type { TrafficConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';

interface TrafficModuleProps {
  config: TrafficConfig;
  style: ModuleStyle;
}

interface TrafficRouteData {
  label: string;
  durationMinutes: number;
  durationInTrafficMinutes: number;
  delayMinutes: number;
}

interface TrafficData {
  routes: TrafficRouteData[];
  mock?: boolean;
}

function delayColor(delayMinutes: number): string {
  if (delayMinutes <= 2) return '#22c55e'; // green
  if (delayMinutes <= 10) return '#eab308'; // yellow
  return '#ef4444'; // red
}

export default function TrafficModule({ config, style }: TrafficModuleProps) {
  const routes = config.routes ?? [];
  const url =
    routes.length > 0
      ? `/api/traffic?routes=${encodeURIComponent(JSON.stringify(routes))}`
      : '';

  const data = useFetchData<TrafficData>(url, config.refreshIntervalMs ?? 300000);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col h-full gap-2">
        <span className="uppercase tracking-widest opacity-50 text-center" style={{ fontSize: '0.75em' }}>
          Traffic
        </span>

        {routes.length === 0 ? (
          <p className="text-center opacity-50" style={{ fontSize: '0.875em' }}>No routes configured</p>
        ) : !data ? (
          <p className="text-center opacity-50" style={{ fontSize: '0.875em' }}>Loading...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.routes.map((route, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: delayColor(route.delayMinutes) }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate" style={{ fontSize: '0.875em' }}>{route.label}</span>
                  <span className="opacity-50" style={{ fontSize: '0.75em' }}>
                    {route.durationInTrafficMinutes} min
                    {route.delayMinutes > 0 && (
                      <span style={{ color: delayColor(route.delayMinutes) }}>
                        {' '}(+{route.delayMinutes} min)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
            {data.mock && (
              <p className="text-center opacity-40 italic" style={{ fontSize: '0.65em', marginTop: '0.25em' }}>
                Sample data — add a traffic API key in Settings
              </p>
            )}
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
}
