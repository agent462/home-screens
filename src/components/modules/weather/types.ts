import type { WeatherConfig } from '@/types/config';
import type { HourlyWeather, ForecastDay } from '@/lib/weather';

export interface WeatherViewProps {
  config: WeatherConfig;
  hourly: HourlyWeather[];
  forecast: ForecastDay[];
  units: 'metric' | 'imperial';
  timezone?: string;
  scaledFontSize: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}
