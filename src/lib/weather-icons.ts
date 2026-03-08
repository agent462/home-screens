import {
  Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudDrizzle,
  CloudSnow, CloudLightning, CloudFog, Snowflake, Thermometer, CloudHail,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type WeatherIconId =
  | 'sun' | 'moon' | 'cloud' | 'cloud-sun' | 'cloud-moon'
  | 'cloud-rain' | 'cloud-drizzle' | 'cloud-snow' | 'cloud-lightning'
  | 'cloud-fog' | 'snowflake' | 'thermometer' | 'cloud-hail';

const iconComponents: Record<WeatherIconId, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  'cloud-sun': CloudSun,
  'cloud-moon': CloudMoon,
  'cloud-rain': CloudRain,
  'cloud-drizzle': CloudDrizzle,
  'cloud-snow': CloudSnow,
  'cloud-lightning': CloudLightning,
  'cloud-fog': CloudFog,
  snowflake: Snowflake,
  thermometer: Thermometer,
  'cloud-hail': CloudHail,
};

export function getWeatherIcon(id: string): LucideIcon {
  return iconComponents[id as WeatherIconId] ?? Thermometer;
}
