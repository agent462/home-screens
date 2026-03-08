export interface HourlyWeather {
  time: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  icon: string;
  description: string;
  windSpeed: number;
  precipProbability: number;
}

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  icon: string;
  description: string;
  precipProbability: number;
  precipAmount: number;
  humidity: number;
  windSpeed: number;
}

export interface WeatherProvider {
  getHourly(lat: number, lon: number, units: string): Promise<HourlyWeather[]>;
  getForecast(lat: number, lon: number, units: string): Promise<ForecastDay[]>;
}

export class OpenWeatherMapProvider implements WeatherProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENWEATHERMAP_API_KEY;
    if (!key) throw new Error('OPENWEATHERMAP_API_KEY is not configured. Add it in Settings.');
    this.apiKey = key;
  }

  async getHourly(lat: number, lon: number, units: string): Promise<HourlyWeather[]> {
    // Use free 2.5 forecast endpoint (5-day/3-hour forecast)
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&cnt=8&appid=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenWeatherMap API error ${res.status}: ${body}`);
    }
    const data = await res.json();

    return (data.list ?? []).map((h: Record<string, unknown>) => ({
      time: new Date((h.dt as number) * 1000).toISOString(),
      temp: (h.main as Record<string, number>)?.temp ?? 0,
      feelsLike: (h.main as Record<string, number>)?.feels_like ?? 0,
      humidity: (h.main as Record<string, number>)?.humidity ?? 0,
      icon: this.mapIcon((h.weather as Array<Record<string, unknown>>)?.[0]?.icon as string ?? ''),
      description: (h.weather as Array<Record<string, unknown>>)?.[0]?.description as string ?? '',
      windSpeed: (h.wind as Record<string, number>)?.speed ?? 0,
      precipProbability: ((h.pop as number) ?? 0) * 100,
    }));
  }

  async getForecast(lat: number, lon: number, units: string): Promise<ForecastDay[]> {
    // Use free 2.5 forecast endpoint, aggregate 5-day/3-hour into daily
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenWeatherMap API error ${res.status}: ${body}`);
    }
    const data = await res.json();

    // Group 3-hour entries by date, compute daily high/low
    const dayMap = new Map<string, { temps: number[]; icons: string[]; descs: string[]; humidity: number[]; wind: number[]; pop: number[]; rain: number }>();
    for (const entry of data.list ?? []) {
      const date = new Date((entry.dt as number) * 1000).toISOString().split('T')[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, { temps: [], icons: [], descs: [], humidity: [], wind: [], pop: [], rain: 0 });
      }
      const day = dayMap.get(date)!;
      const main = entry.main as Record<string, number>;
      day.temps.push(main.temp);
      day.humidity.push(main.humidity);
      day.wind.push((entry.wind as Record<string, number>)?.speed ?? 0);
      day.pop.push(((entry.pop as number) ?? 0) * 100);
      day.rain += (entry.rain as Record<string, number>)?.['3h'] ?? 0;
      const weather = (entry.weather as Array<Record<string, unknown>>)?.[0];
      day.icons.push(weather?.icon as string ?? '');
      day.descs.push(weather?.description as string ?? '');
    }

    const days: ForecastDay[] = [];
    for (const [date, day] of dayMap) {
      days.push({
        date,
        high: Math.round(Math.max(...day.temps)),
        low: Math.round(Math.min(...day.temps)),
        icon: this.mapIcon(day.icons[Math.floor(day.icons.length / 2)] ?? ''),
        description: day.descs[Math.floor(day.descs.length / 2)] ?? '',
        precipProbability: Math.round(Math.max(...day.pop)),
        precipAmount: units === 'imperial' ? Math.round(day.rain / 25.4 * 100) / 100 : Math.round(day.rain * 10) / 10,
        humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        windSpeed: Math.round(day.wind.reduce((a, b) => a + b, 0) / day.wind.length),
      });
    }
    return days.slice(0, 7);
  }

  private mapIcon(owmIcon: string): string {
    const map: Record<string, string> = {
      '01d': 'sun', '01n': 'moon',
      '02d': 'cloud-sun', '02n': 'cloud-moon',
      '03d': 'cloud', '03n': 'cloud',
      '04d': 'cloud', '04n': 'cloud',
      '09d': 'cloud-rain', '09n': 'cloud-rain',
      '10d': 'cloud-drizzle', '10n': 'cloud-rain',
      '11d': 'cloud-lightning', '11n': 'cloud-lightning',
      '13d': 'snowflake', '13n': 'snowflake',
      '50d': 'cloud-fog', '50n': 'cloud-fog',
    };
    return map[owmIcon] ?? 'thermometer';
  }
}

export class WeatherAPIProvider implements WeatherProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.WEATHERAPI_KEY;
    if (!key) throw new Error('WEATHERAPI_KEY is not configured. Add it in Settings.');
    this.apiKey = key;
  }

  async getHourly(lat: number, lon: number, units: string): Promise<HourlyWeather[]> {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${this.apiKey}&q=${lat},${lon}&days=2&aqi=no`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`WeatherAPI error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const isCelsius = units === 'metric';
    const isDay = data.current?.is_day === 1;

    const allDays = data.forecast?.forecastday ?? [];
    const allHours = allDays.flatMap((d: Record<string, unknown>) => (d as Record<string, unknown[]>).hour ?? []);
    const now = new Date();
    const hours = allHours.filter((h: Record<string, unknown>) => new Date(h.time as string) >= now);
    return hours.map((h: Record<string, unknown>) => ({
      time: h.time as string,
      temp: isCelsius ? (h.temp_c as number) : (h.temp_f as number),
      feelsLike: isCelsius ? (h.feelslike_c as number) : (h.feelslike_f as number),
      humidity: h.humidity as number,
      icon: this.mapConditionToIcon((h.condition as Record<string, unknown>)?.code as number, isDay),
      description: (h.condition as Record<string, unknown>)?.text as string ?? '',
      windSpeed: isCelsius ? (h.wind_kph as number) : (h.wind_mph as number),
      precipProbability: (h.chance_of_rain as number) ?? 0,
    }));
  }

  async getForecast(lat: number, lon: number, units: string): Promise<ForecastDay[]> {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${this.apiKey}&q=${lat},${lon}&days=7&aqi=no`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`WeatherAPI error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const isCelsius = units === 'metric';

    const days = data.forecast?.forecastday ?? [];
    return days.map((d: Record<string, unknown>) => {
      const day = d.day as Record<string, unknown>;
      return {
        date: d.date as string,
        high: isCelsius ? (day.maxtemp_c as number) : (day.maxtemp_f as number),
        low: isCelsius ? (day.mintemp_c as number) : (day.mintemp_f as number),
        icon: this.mapConditionToIcon((day.condition as Record<string, unknown>)?.code as number, true),
        description: ((day.condition as Record<string, unknown>)?.text as string) ?? '',
        precipProbability: (day.daily_chance_of_rain as number) ?? 0,
        precipAmount: isCelsius ? ((day.totalprecip_mm as number) ?? 0) : ((day.totalprecip_in as number) ?? 0),
        humidity: day.avghumidity as number,
        windSpeed: isCelsius ? (day.maxwind_kph as number) : (day.maxwind_mph as number),
      };
    });
  }

  private mapConditionToIcon(code: number, isDay: boolean): string {
    if (code === 1000) return isDay ? 'sun' : 'moon';
    if (code === 1003) return isDay ? 'cloud-sun' : 'cloud-moon';
    if ([1006, 1009].includes(code)) return 'cloud';
    if (code === 1030) return 'cloud-fog';
    if ([1063, 1150, 1153, 1180, 1183].includes(code)) return 'cloud-drizzle';
    if ([1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return 'cloud-rain';
    if ([1066, 1114, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return 'snowflake';
    if ([1069, 1072, 1168, 1171, 1198, 1201, 1204, 1207, 1237, 1249, 1252].includes(code)) return 'cloud-hail';
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 'cloud-lightning';
    if ([1117, 1135, 1147].includes(code)) return 'cloud-fog';
    return 'thermometer';
  }
}

export function createWeatherProvider(provider: string, apiKey?: string): WeatherProvider {
  switch (provider) {
    case 'openweathermap':
      return new OpenWeatherMapProvider(apiKey);
    case 'weatherapi':
      return new WeatherAPIProvider(apiKey);
    default:
      throw new Error(`Unknown weather provider: ${provider}`);
  }
}
