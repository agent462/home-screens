'use client';

import type { WeatherConfig, WeatherView, ModuleStyle } from '@/types/config';
import type { HourlyWeather, ForecastDay, MinutelyPrecip, WeatherAlert } from '@/lib/weather';
import { useScaledFontSize } from '@/hooks/useScaledFontSize';
import ModuleWrapper from '../ModuleWrapper';
import WeatherCurrentView from './WeatherCurrentView';
import WeatherHourlyView from './WeatherHourlyView';
import WeatherDailyView from './WeatherDailyView';
import WeatherCombinedView from './WeatherCombinedView';
import WeatherCompactView from './WeatherCompactView';
import WeatherTableView from './WeatherTableView';
import WeatherPrecipitationView from './WeatherPrecipitationView';
import WeatherAlertsView from './WeatherAlertsView';

interface WeatherModuleProps {
  config: WeatherConfig;
  style: ModuleStyle;
  hourly?: HourlyWeather[];
  forecast?: ForecastDay[];
  minutely?: MinutelyPrecip[];
  alerts?: WeatherAlert[];
  units?: 'metric' | 'imperial';
  timezone?: string;
}

const SCALE_FACTORS: Record<WeatherView, number> = {
  current: 0.12,
  hourly: 0.09,
  daily: 0.12,
  combined: 0.06,
  compact: 0.25,
  table: 0.08,
  precipitation: 0.09,
  alerts: 0.08,
};

const VIEW_COMPONENTS = {
  current: WeatherCurrentView,
  hourly: WeatherHourlyView,
  daily: WeatherDailyView,
  combined: WeatherCombinedView,
  compact: WeatherCompactView,
  table: WeatherTableView,
  precipitation: WeatherPrecipitationView,
  alerts: WeatherAlertsView,
};

export default function WeatherModule({ config, style, hourly, forecast, minutely, alerts, units = 'imperial', timezone }: WeatherModuleProps) {
  const view = config.view ?? 'hourly';
  const scaleFactor = SCALE_FACTORS[view] ?? 0.09;
  const { containerRef, scaledFontSize } = useScaledFontSize(style.fontSize, scaleFactor);

  const ViewComponent = VIEW_COMPONENTS[view] ?? WeatherHourlyView;

  return (
    <ModuleWrapper style={style}>
      <ViewComponent
        config={config}
        hourly={hourly ?? []}
        forecast={forecast ?? []}
        minutely={minutely}
        alerts={alerts}
        units={units}
        timezone={timezone}
        scaledFontSize={scaledFontSize}
        containerRef={containerRef}
      />
    </ModuleWrapper>
  );
}
