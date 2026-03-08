// ── Public types ─────────────────────────────────────────────────────

export interface HourlyWeather {
  time: string;
  temp: number;
  feelsLike?: number;
  humidity?: number;
  icon: string;
  description: string;
  windSpeed?: number;
  precipProbability?: number;
}

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  icon: string;
  description: string;
  precipProbability?: number;
  precipAmount?: number;
  humidity?: number;
  windSpeed?: number;
}

export interface WeatherProvider {
  getHourly(lat: number, lon: number, units: string): Promise<HourlyWeather[]>;
  getForecast(lat: number, lon: number, units: string): Promise<ForecastDay[]>;
}

// ── OpenWeatherMap API response types ────────────────────────────────

interface OWMWeatherEntry {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface OWMMain {
  temp: number;
  feels_like: number;
  humidity: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
}

interface OWMWind {
  speed: number;
  deg: number;
}

interface OWMCurrentResponse {
  dt: number;
  main: OWMMain;
  weather: OWMWeatherEntry[];
  wind: OWMWind;
}

interface OWMForecastEntry {
  dt: number;
  main: OWMMain;
  weather: OWMWeatherEntry[];
  wind: OWMWind;
  pop: number;
  rain?: { '3h'?: number };
}

interface OWMForecastResponse {
  list: OWMForecastEntry[];
}

// ── WeatherAPI response types ────────────────────────────────────────

interface WACondition {
  text: string;
  code: number;
}

interface WAHour {
  time: string;
  time_epoch: number;
  temp_c: number;
  temp_f: number;
  feelslike_c: number;
  feelslike_f: number;
  humidity: number;
  wind_kph: number;
  wind_mph: number;
  condition: WACondition;
  chance_of_rain: number;
}

interface WADay {
  maxtemp_c: number;
  maxtemp_f: number;
  mintemp_c: number;
  mintemp_f: number;
  avghumidity: number;
  maxwind_kph: number;
  maxwind_mph: number;
  totalprecip_mm: number;
  totalprecip_in: number;
  daily_chance_of_rain: number;
  condition: WACondition;
}

interface WAForecastDay {
  date: string;
  day: WADay;
  hour: WAHour[];
}

interface WAForecastResponse {
  current: { is_day: number };
  forecast: { forecastday: WAForecastDay[] };
}

// ── Helpers ──────────────────────────────────────────────────────────

interface DayAccumulator {
  temps: number[];
  icons: string[];
  descs: string[];
  humidity: number[];
  wind: number[];
  pop: number[];
  rain: number;
}

function groupByDate(entries: OWMForecastEntry[]): Map<string, DayAccumulator> {
  const dayMap = new Map<string, DayAccumulator>();
  for (const entry of entries) {
    const date = new Date(entry.dt * 1000).toISOString().split('T')[0];
    if (!dayMap.has(date)) {
      dayMap.set(date, { temps: [], icons: [], descs: [], humidity: [], wind: [], pop: [], rain: 0 });
    }
    const day = dayMap.get(date)!;
    day.temps.push(entry.main.temp);
    day.humidity.push(entry.main.humidity);
    day.wind.push(entry.wind?.speed ?? 0);
    day.pop.push((entry.pop ?? 0) * 100);
    day.rain += entry.rain?.['3h'] ?? 0;
    const weather = entry.weather?.[0];
    day.icons.push(weather?.icon ?? '');
    day.descs.push(weather?.description ?? '');
  }
  return dayMap;
}

function aggregateDay(date: string, day: DayAccumulator, units: string, mapIcon: (icon: string) => string): ForecastDay {
  return {
    date,
    high: Math.round(Math.max(...day.temps)),
    low: Math.round(Math.min(...day.temps)),
    icon: mapIcon(day.icons[Math.floor(day.icons.length / 2)] ?? ''),
    description: day.descs[Math.floor(day.descs.length / 2)] ?? '',
    precipProbability: Math.round(Math.max(...day.pop)),
    precipAmount: units === 'imperial' ? Math.round(day.rain / 25.4 * 100) / 100 : Math.round(day.rain * 10) / 10,
    humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
    windSpeed: Math.round(day.wind.reduce((a, b) => a + b, 0) / day.wind.length),
  };
}

// ── OpenWeatherMap provider ──────────────────────────────────────────

export class OpenWeatherMapProvider implements WeatherProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENWEATHERMAP_API_KEY;
    if (!key) throw new Error('OPENWEATHERMAP_API_KEY is not configured. Add it in Settings.');
    this.apiKey = key;
  }

  async getHourly(lat: number, lon: number, units: string): Promise<HourlyWeather[]> {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${this.apiKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&cnt=8&appid=${this.apiKey}`),
    ]);
    if (!currentRes.ok) {
      const body = await currentRes.text();
      throw new Error(`OpenWeatherMap API error ${currentRes.status}: ${body}`);
    }
    if (!forecastRes.ok) {
      const body = await forecastRes.text();
      throw new Error(`OpenWeatherMap API error ${forecastRes.status}: ${body}`);
    }
    const currentData: OWMCurrentResponse = await currentRes.json();
    const forecastData: OWMForecastResponse = await forecastRes.json();

    const current: HourlyWeather = {
      time: new Date(currentData.dt * 1000).toISOString(),
      temp: currentData.main.temp,
      feelsLike: currentData.main.feels_like,
      humidity: currentData.main.humidity,
      icon: this.mapIcon(currentData.weather[0]?.icon ?? ''),
      description: currentData.weather[0]?.description ?? '',
      windSpeed: currentData.wind.speed,
      precipProbability: 0,
    };

    const forecast = forecastData.list.map((h) => ({
      time: new Date(h.dt * 1000).toISOString(),
      temp: h.main.temp,
      feelsLike: h.main.feels_like,
      humidity: h.main.humidity,
      icon: this.mapIcon(h.weather[0]?.icon ?? ''),
      description: h.weather[0]?.description ?? '',
      windSpeed: h.wind.speed,
      precipProbability: (h.pop ?? 0) * 100,
    }));

    return [current, ...forecast];
  }

  async getForecast(lat: number, lon: number, units: string): Promise<ForecastDay[]> {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenWeatherMap API error ${res.status}: ${body}`);
    }
    const data: OWMForecastResponse = await res.json();
    const dayMap = groupByDate(data.list ?? []);

    const days: ForecastDay[] = [];
    for (const [date, day] of dayMap) {
      days.push(aggregateDay(date, day, units, (icon) => this.mapIcon(icon)));
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

// ── WeatherAPI provider ──────────────────────────────────────────────

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
    const data: WAForecastResponse = await res.json();
    const isCelsius = units === 'metric';
    const isDay = data.current?.is_day === 1;

    const allHours = data.forecast.forecastday.flatMap((d) => d.hour);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const hours = allHours.filter((h) => h.time_epoch >= nowEpoch);
    return hours.map((h) => ({
      time: h.time,
      temp: isCelsius ? h.temp_c : h.temp_f,
      feelsLike: isCelsius ? h.feelslike_c : h.feelslike_f,
      humidity: h.humidity,
      icon: this.mapConditionToIcon(h.condition.code, isDay),
      description: h.condition.text ?? '',
      windSpeed: isCelsius ? h.wind_kph : h.wind_mph,
      precipProbability: h.chance_of_rain ?? 0,
    }));
  }

  async getForecast(lat: number, lon: number, units: string): Promise<ForecastDay[]> {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${this.apiKey}&q=${lat},${lon}&days=7&aqi=no`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`WeatherAPI error ${res.status}: ${body}`);
    }
    const data: WAForecastResponse = await res.json();
    const isCelsius = units === 'metric';

    return data.forecast.forecastday.map((d) => ({
      date: d.date,
      high: isCelsius ? d.day.maxtemp_c : d.day.maxtemp_f,
      low: isCelsius ? d.day.mintemp_c : d.day.mintemp_f,
      icon: this.mapConditionToIcon(d.day.condition.code, true),
      description: d.day.condition.text ?? '',
      precipProbability: d.day.daily_chance_of_rain ?? 0,
      precipAmount: isCelsius ? (d.day.totalprecip_mm ?? 0) : (d.day.totalprecip_in ?? 0),
      humidity: d.day.avghumidity,
      windSpeed: isCelsius ? d.day.maxwind_kph : d.day.maxwind_mph,
    }));
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

// ── Factory ──────────────────────────────────────────────────────────

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
