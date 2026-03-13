'use client';

import type { AirQualityConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { ModuleLoadingState } from './ModuleStates';
import { useFetchData } from '@/hooks/useFetchData';
import { airQualityUrl } from '@/lib/fetch-keys';

interface AirQualityModuleProps {
  config: AirQualityConfig;
  style: ModuleStyle;
}

interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  uv: number;
}

const AQI_LABELS: Record<number, string> = {
  1: 'Good',
  2: 'Fair',
  3: 'Moderate',
  4: 'Poor',
  5: 'Very Poor',
};

const AQI_COLORS: Record<number, string> = {
  1: 'bg-green-600',
  2: 'bg-yellow-500',
  3: 'bg-orange-500',
  4: 'bg-red-600',
  5: 'bg-purple-600',
};

function getUVLabel(uv: number): string {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

function getUVColor(uv: number): string {
  if (uv <= 2) return 'text-green-400';
  if (uv <= 5) return 'text-yellow-400';
  if (uv <= 7) return 'text-orange-400';
  if (uv <= 10) return 'text-red-400';
  return 'text-purple-400';
}

export default function AirQualityModule({ config, style }: AirQualityModuleProps) {
  const [data, error] = useFetchData<AirQualityData>(
    airQualityUrl(),
    config.refreshIntervalMs ?? 600000,
  );

  if (data === null) {
    return <ModuleLoadingState style={style} message="Loading air quality…" error={error} />;
  }

  const aqiLabel = AQI_LABELS[data.aqi] ?? 'Unknown';
  const aqiColor = AQI_COLORS[data.aqi] ?? 'bg-gray-500';

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col gap-3 w-full h-full justify-center">
        {config.showAQI !== false && (
          <div className="flex items-center gap-3">
            <span className={`${aqiColor} text-white font-bold px-3 py-1 rounded-full`} style={{ fontSize: '0.875em' }}>
              AQI {data.aqi}
            </span>
            <span className="opacity-80" style={{ fontSize: '0.875em' }}>{aqiLabel}</span>
          </div>
        )}

        {config.showPollutants && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-70" style={{ fontSize: '0.875em' }}>
            <span>PM2.5: {data.pm25.toFixed(1)} &mu;g/m&sup3;</span>
            <span>PM10: {data.pm10.toFixed(1)} &mu;g/m&sup3;</span>
            <span>O₃: {data.o3.toFixed(1)} &mu;g/m&sup3;</span>
          </div>
        )}

        {config.showUV !== false && (
          <div className="flex items-center gap-2" style={{ fontSize: '0.875em' }}>
            <span className="opacity-70">UV Index:</span>
            <span className={`font-semibold ${getUVColor(data.uv)}`}>
              {data.uv.toFixed(1)} &mdash; {getUVLabel(data.uv)}
            </span>
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
}
