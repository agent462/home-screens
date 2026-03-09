'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import Slider from '@/components/ui/Slider';
import Toggle from '@/components/ui/Toggle';
import ColorPicker from '@/components/ui/ColorPicker';
import Button from '@/components/ui/Button';
import BackgroundPicker from '@/components/editor/BackgroundPicker';
import type { ModuleInstance, CountdownEvent, TodoItem, WeatherView, WeatherIconSet, WeatherProviderOption, StockTickerView } from '@/types/config';
import { v4 as uuidv4 } from 'uuid';

const INPUT_CLASS = 'w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200';
const INPUT_CLASS_FLEX = 'flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200';

function AccordionSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full py-1.5 text-left group"
      >
        <ChevronRight
          className={`w-3 h-3 text-neutral-500 transition-transform duration-200 ${
            open ? 'rotate-90' : ''
          }`}
        />
        <span className="text-xs font-semibold text-neutral-500 uppercase">{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PositionSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { moveModule, resizeModule } = useEditorStore();
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'X', value: mod.position.x, key: 'x' },
          { label: 'Y', value: mod.position.y, key: 'y' },
        ].map(({ label, value, key }) => (
          <label key={key} className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400">{label}</span>
            <input
              type="number"
              value={value}
              onChange={(e) =>
                moveModule(screenId, mod.id, {
                  ...mod.position,
                  [key]: Number(e.target.value),
                })
              }
              className={INPUT_CLASS}
            />
          </label>
        ))}
        {[
          { label: 'W', value: mod.size.w, key: 'w' },
          { label: 'H', value: mod.size.h, key: 'h' },
        ].map(({ label, value, key }) => (
          <label key={key} className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400">{label}</span>
            <input
              type="number"
              value={value}
              onChange={(e) =>
                resizeModule(screenId, mod.id, {
                  ...mod.size,
                  [key]: Number(e.target.value),
                })
              }
              className={INPUT_CLASS}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function StyleSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModuleStyle } = useEditorStore();
  const s = mod.style;
  const set = (updates: Partial<typeof s>) => updateModuleStyle(screenId, mod.id, updates);

  return (
    <div className="space-y-3">
      <Slider label="Opacity" value={s.opacity} min={0} max={1} step={0.05} onChange={(v) => set({ opacity: v })} />
      <Slider label="Border Radius" value={s.borderRadius} min={0} max={50} onChange={(v) => set({ borderRadius: v })} />
      <Slider label="Padding" value={s.padding} min={0} max={64} onChange={(v) => set({ padding: v })} />
      <Slider label="Font Size" value={s.fontSize} min={8} max={72} onChange={(v) => set({ fontSize: v })} />
      <Slider label="Backdrop Blur" value={s.backdropBlur} min={0} max={40} step={0.5} onChange={(v) => set({ backdropBlur: v })} />
      <ColorPicker label="Background" value={s.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
      <ColorPicker label="Text Color" value={s.textColor} onChange={(v) => set({ textColor: v })} />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Font Family</span>
        <select
          value={s.fontFamily}
          onChange={(e) => set({ fontFamily: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="monospace">Monospace</option>
          <option value="system-ui, sans-serif">System UI</option>
        </select>
      </label>
    </div>
  );
}

function ClockConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ format24h?: boolean; showSeconds?: boolean; showDate?: boolean; dateFormat?: string; showWeekNumber?: boolean; showDayOfYear?: boolean }>(mod, screenId);

  return (
    <>
      <Toggle label="24-Hour Format" checked={!!c.format24h} onChange={(v) => set({ format24h: v })} />
      <Toggle label="Show Seconds" checked={c.showSeconds !== false} onChange={(v) => set({ showSeconds: v })} />
      <Toggle label="Show Date" checked={c.showDate !== false} onChange={(v) => set({ showDate: v })} />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Date Format</span>
        <input
          type="text"
          value={(c.dateFormat as string) || ''}
          onChange={(e) => set({ dateFormat: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <Toggle label="Show Week Number" checked={!!c.showWeekNumber} onChange={(v) => set({ showWeekNumber: v })} />
      <Toggle label="Show Day of Year" checked={!!c.showDayOfYear} onChange={(v) => set({ showDayOfYear: v })} />
    </>
  );
}

function CalendarConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ viewMode?: string; daysToShow?: number; showTime?: boolean; showLocation?: boolean; maxEvents?: number; showWeekNumbers?: boolean }>(mod, screenId);
  const viewMode = c.viewMode ?? 'daily';

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">View Mode</span>
        <select
          value={viewMode}
          onChange={(e) => set({ viewMode: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="daily">Daily Columns</option>
          <option value="agenda">Agenda List</option>
          <option value="week">Week Grid</option>
          <option value="month">Month Grid</option>
        </select>
      </label>
      {viewMode === 'daily' && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Days to Show</span>
          <input
            type="number"
            min={1}
            max={14}
            value={c.daysToShow ?? 3}
            onChange={(e) => set({ daysToShow: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {viewMode === 'agenda' && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Max Events</span>
          <input
            type="number"
            min={1}
            max={50}
            value={c.maxEvents ?? 20}
            onChange={(e) => set({ maxEvents: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {(viewMode === 'daily' || viewMode === 'agenda') && (
        <>
          <Toggle label="Show Time" checked={c.showTime !== false} onChange={(v) => set({ showTime: v })} />
          <Toggle label="Show Location" checked={!!c.showLocation} onChange={(v) => set({ showLocation: v })} />
        </>
      )}
      {(viewMode === 'week' || viewMode === 'month') && (
        <Toggle label="Show Week Numbers" checked={!!c.showWeekNumbers} onChange={(v) => set({ showWeekNumbers: v })} />
      )}
    </>
  );
}

const WEATHER_VIEWS: { value: WeatherView; label: string }[] = [
  { value: 'current', label: 'Current Only' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily Forecast' },
  { value: 'combined', label: 'Combined' },
  { value: 'compact', label: 'Compact' },
  { value: 'table', label: 'Table' },
];

function WeatherConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{
    view?: WeatherView;
    iconSet?: WeatherIconSet;
    provider?: WeatherProviderOption;
    hoursToShow?: number;
    showFeelsLike?: boolean;
    daysToShow?: number;
    showHighLow?: boolean;
    showPrecipitation?: boolean;
    showPrecipAmount?: boolean;
    showHumidity?: boolean;
    showWind?: boolean;
  }>(mod, screenId);

  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/secrets');
        if (res.ok) {
          const data: Record<string, boolean> = await res.json();
          const providers: string[] = [];
          if (data.openweathermap_key) providers.push('openweathermap');
          if (data.weatherapi_key) providers.push('weatherapi');
          setConfiguredProviders(providers);
        }
      } catch { /* ignore */ }
    }
    check();
  }, []);

  const view = c.view ?? 'hourly';
  const showsHours = view === 'hourly' || view === 'combined';
  const showsDays = view === 'daily' || view === 'combined' || view === 'table';
  const showsCurrent = ['current', 'hourly', 'combined', 'compact'].includes(view);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">View</span>
        <select
          value={view}
          onChange={(e) => set({ view: e.target.value as WeatherView })}
          className={INPUT_CLASS}
        >
          {WEATHER_VIEWS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Icon Style</span>
        <select
          value={c.iconSet ?? 'color'}
          onChange={(e) => set({ iconSet: e.target.value as WeatherIconSet })}
          className={INPUT_CLASS}
        >
          <option value="outline">Outline</option>
          <option value="color">Color</option>
        </select>
      </label>
      {configuredProviders.length > 0 && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Data Provider</span>
          <select
            value={c.provider ?? 'global'}
            onChange={(e) => set({ provider: e.target.value as WeatherProviderOption })}
            className={INPUT_CLASS}
          >
            <option value="global">Global Default</option>
            {configuredProviders.includes('openweathermap') && (
              <option value="openweathermap">OpenWeatherMap</option>
            )}
            {configuredProviders.includes('weatherapi') && (
              <option value="weatherapi">WeatherAPI</option>
            )}
          </select>
        </label>
      )}
      {showsHours && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Hours to Show</span>
          <input
            type="number"
            value={c.hoursToShow ?? 8}
            onChange={(e) => set({ hoursToShow: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {showsDays && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Days to Show</span>
          <input
            type="number"
            value={c.daysToShow ?? 5}
            onChange={(e) => set({ daysToShow: Number(e.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      {showsCurrent && (
        <Toggle label="Feels Like" checked={c.showFeelsLike !== false} onChange={(v) => set({ showFeelsLike: v })} />
      )}
      {showsDays && (
        <Toggle label="High / Low" checked={c.showHighLow !== false} onChange={(v) => set({ showHighLow: v })} />
      )}
      <Toggle label="Precipitation" checked={c.showPrecipitation !== false} onChange={(v) => set({ showPrecipitation: v })} />
      {showsDays && (
        <Toggle label="Precipitation Amount" checked={!!c.showPrecipAmount} onChange={(v) => set({ showPrecipAmount: v })} />
      )}
      <Toggle label="Humidity" checked={!!c.showHumidity} onChange={(v) => set({ showHumidity: v })} />
      <Toggle label="Wind Speed" checked={!!c.showWind} onChange={(v) => set({ showWind: v })} />
    </>
  );
}


function CountdownConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ events?: CountdownEvent[]; scale?: number; showPastEvents?: boolean }>(mod, screenId);
  const events = c.events ?? [];

  const addEvent = () => {
    set({
      events: [...events, { id: uuidv4(), name: 'New Event', date: new Date().toISOString().slice(0, 16) }],
    });
  };

  const removeEvent = (id: string) => {
    set({ events: events.filter((ev) => ev.id !== id) });
  };

  const updateEvent = (id: string, updates: Partial<CountdownEvent>) => {
    set({ events: events.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)) });
  };

  return (
    <div className="space-y-2">
      <Toggle label="Show Past Events" checked={!!c.showPastEvents} onChange={(v) => set({ showPastEvents: v })} />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Scale ({((c.scale ?? 1) * 100).toFixed(0)}%)</span>
        <input
          type="range"
          min="0.5"
          max="4"
          step="0.1"
          value={c.scale ?? 1}
          onChange={(e) => set({ scale: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </label>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Events</span>
        <Button size="sm" onClick={addEvent}>Add</Button>
      </div>
      {events.map((ev) => (
        <div key={ev.id} className="p-2 bg-neutral-800 rounded space-y-1">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={ev.name}
              onChange={(e) => updateEvent(ev.id, { name: e.target.value })}
              placeholder="Name"
              className="flex-1 px-2 py-0.5 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-200"
            />
            <button onClick={() => removeEvent(ev.id)} className="text-red-400 text-xs px-1">x</button>
          </div>
          <input
            type="datetime-local"
            value={ev.date.includes('T') ? ev.date.slice(0, 16) : ev.date + 'T00:00'}
            onChange={(e) => updateEvent(ev.id, { date: e.target.value })}
            className="w-full px-2 py-0.5 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-200"
          />
        </div>
      ))}
    </div>
  );
}

function DadJokeConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ refreshIntervalMs?: number }>(mod, screenId);

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">Refresh Interval (ms)</span>
      <input
        type="number"
        value={c.refreshIntervalMs ?? 60000}
        onChange={(e) => set({ refreshIntervalMs: Number(e.target.value) })}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function TextConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ content?: string; alignment?: string }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Content</span>
        <textarea
          value={(c.content as string) || ''}
          onChange={(e) => set({ content: e.target.value })}
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Alignment</span>
        <select
          value={(c.alignment as string) || 'center'}
          onChange={(e) => set({ alignment: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
    </>
  );
}

function ImageConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ src?: string; objectFit?: string; alt?: string }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Image URL</span>
        <input
          type="text"
          value={(c.src as string) || ''}
          onChange={(e) => set({ src: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Object Fit</span>
        <select
          value={(c.objectFit as string) || 'cover'}
          onChange={(e) => set({ objectFit: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Alt Text</span>
        <input
          type="text"
          value={(c.alt as string) || ''}
          onChange={(e) => set({ alt: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
    </>
  );
}

function QuoteConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ refreshIntervalMs?: number }>(mod, screenId);

  return (
    <Slider
      label="Refresh Interval (seconds)"
      value={(c.refreshIntervalMs ?? 300000) / 1000}
      min={30}
      max={3600}
      step={30}
      onChange={(v) => set({ refreshIntervalMs: v * 1000 })}
    />
  );
}

function TodoConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ title?: string; items?: TodoItem[] }>(mod, screenId);
  const items = c.items ?? [];

  const addItem = () => {
    set({ items: [...items, { id: uuidv4(), text: 'New item', completed: false }] });
  };

  const removeItem = (id: string) => {
    set({ items: items.filter((it) => it.id !== id) });
  };

  const updateItem = (id: string, updates: Partial<TodoItem>) => {
    set({ items: items.map((it) => (it.id === id ? { ...it, ...updates } : it)) });
  };

  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Title</span>
        <input
          type="text"
          value={(c.title as string) || 'To Do'}
          onChange={(e) => set({ title: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Items</span>
        <Button size="sm" onClick={addItem}>Add</Button>
      </div>
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-1 p-1 bg-neutral-800 rounded">
          <input
            type="checkbox"
            checked={it.completed}
            onChange={(e) => updateItem(it.id, { completed: e.target.checked })}
            className="rounded border-neutral-600 bg-neutral-700 text-blue-500"
          />
          <input
            type="text"
            value={it.text}
            onChange={(e) => updateItem(it.id, { text: e.target.value })}
            className="flex-1 px-2 py-0.5 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-200"
          />
          <button onClick={() => removeItem(it.id)} className="text-red-400 text-xs px-1">x</button>
        </div>
      ))}
    </div>
  );
}

function StickyNoteConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ content?: string; noteColor?: string }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Content</span>
        <textarea
          value={(c.content as string) || ''}
          onChange={(e) => set({ content: e.target.value })}
          rows={4}
          className={`${INPUT_CLASS} resize-none`}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Note Color</span>
        <input
          type="color"
          value={(c.noteColor as string) || '#fef08a'}
          onChange={(e) => set({ noteColor: e.target.value })}
          className="w-full h-8 rounded bg-neutral-800 border border-neutral-600 cursor-pointer"
        />
      </label>
    </>
  );
}

function GreetingConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ name?: string }>(mod, screenId);

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">Name</span>
      <input
        type="text"
        value={(c.name as string) || 'Friend'}
        onChange={(e) => set({ name: e.target.value })}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function NewsConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ feedUrl?: string; refreshIntervalMs?: number; rotateIntervalMs?: number }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">RSS Feed URL (blank = BBC News)</span>
        <input
          type="text"
          value={(c.feedUrl as string) || ''}
          onChange={(e) => set({ feedUrl: e.target.value })}
          placeholder="https://feeds.bbci.co.uk/news/rss.xml"
          className={INPUT_CLASS}
        />
      </label>
      <Slider
        label="Rotate Headlines (seconds)"
        value={(c.rotateIntervalMs ?? 10000) / 1000}
        min={3}
        max={30}
        onChange={(v) => set({ rotateIntervalMs: v * 1000 })}
      />
      <Slider
        label="Refresh Feed (seconds)"
        value={(c.refreshIntervalMs ?? 300000) / 1000}
        min={60}
        max={3600}
        step={60}
        onChange={(v) => set({ refreshIntervalMs: v * 1000 })}
      />
    </>
  );
}

const STOCK_VIEWS: { value: StockTickerView; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'ticker', label: 'Ticker (Scrolling)' },
  { value: 'table', label: 'Table' },
  { value: 'compact', label: 'Compact' },
];

function StockTickerConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ symbols?: string; view?: StockTickerView; refreshIntervalMs?: number; cardScale?: number; tickerSpeed?: number }>(mod, screenId);

  const view = c.view ?? 'cards';

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Symbols (comma-separated)</span>
        <input
          type="text"
          value={(c.symbols as string) || 'AAPL,GOOGL,MSFT'}
          onChange={(e) => set({ symbols: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">View</span>
        <select
          value={view}
          onChange={(e) => set({ view: e.target.value as StockTickerView })}
          className={INPUT_CLASS}
        >
          {STOCK_VIEWS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </label>
      {view !== 'ticker' && (
        <Slider
          label="Scale"
          value={c.cardScale ?? 1}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) => set({ cardScale: v })}
        />
      )}
      {view === 'ticker' && (
        <Slider
          label="Ticker Speed (sec/stock)"
          value={c.tickerSpeed ?? 5}
          min={2}
          max={15}
          step={1}
          onChange={(v) => set({ tickerSpeed: v })}
        />
      )}
      <Slider
        label="Refresh (seconds)"
        value={(c.refreshIntervalMs ?? 60000) / 1000}
        min={30}
        max={600}
        step={30}
        onChange={(v) => set({ refreshIntervalMs: v * 1000 })}
      />
    </>
  );
}

function CryptoConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ ids?: string; refreshIntervalMs?: number; cardScale?: number }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Coin IDs (comma-separated, CoinGecko)</span>
        <input
          type="text"
          value={(c.ids as string) || 'bitcoin,ethereum'}
          onChange={(e) => set({ ids: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <Slider
        label="Card Scale"
        value={c.cardScale ?? 1}
        min={0.5}
        max={3}
        step={0.1}
        onChange={(v) => set({ cardScale: v })}
      />
      <Slider
        label="Refresh (seconds)"
        value={(c.refreshIntervalMs ?? 60000) / 1000}
        min={30}
        max={600}
        step={30}
        onChange={(v) => set({ refreshIntervalMs: v * 1000 })}
      />
    </>
  );
}

function HistoryConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ refreshIntervalMs?: number; rotationIntervalMs?: number }>(mod, screenId);

  return (
    <>
      <Slider
        label="Cycle Events (seconds)"
        value={(c.rotationIntervalMs ?? 10000) / 1000}
        min={5}
        max={120}
        step={5}
        onChange={(v) => set({ rotationIntervalMs: v * 1000 })}
      />
      <Slider
        label="Reload Data (minutes)"
        value={(c.refreshIntervalMs ?? 3600000) / 60000}
        min={5}
        max={1440}
        step={5}
        onChange={(v) => set({ refreshIntervalMs: v * 60000 })}
      />
    </>
  );
}

function MoonPhaseConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ showIllumination?: boolean; showMoonTimes?: boolean }>(mod, screenId);

  return (
    <>
      <Toggle label="Show Illumination %" checked={c.showIllumination !== false} onChange={(v) => set({ showIllumination: v })} />
      <Toggle label="Show Moon Times" checked={c.showMoonTimes !== false} onChange={(v) => set({ showMoonTimes: v })} />
      <p className="text-xs text-neutral-500">Uses location from global settings.</p>
    </>
  );
}

function SunriseSunsetConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ showDayLength?: boolean; showGoldenHour?: boolean }>(mod, screenId);

  return (
    <>
      <Toggle label="Show Day Length" checked={c.showDayLength !== false} onChange={(v) => set({ showDayLength: v })} />
      <Toggle label="Show Golden Hour" checked={!!c.showGoldenHour} onChange={(v) => set({ showGoldenHour: v })} />
      <p className="text-xs text-neutral-500">Uses location from global settings.</p>
    </>
  );
}

function PhotoSlideshowConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ directory?: string; intervalMs?: number; transition?: string; objectFit?: string }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Directory (subfolder in backgrounds)</span>
        <input
          type="text"
          value={(c.directory as string) || ''}
          onChange={(e) => set({ directory: e.target.value })}
          placeholder="Leave empty for all backgrounds"
          className={INPUT_CLASS}
        />
      </label>
      <Slider
        label="Slide Interval (seconds)"
        value={(c.intervalMs ?? 30000) / 1000}
        min={5}
        max={300}
        step={5}
        onChange={(v) => set({ intervalMs: v * 1000 })}
      />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Transition</span>
        <select
          value={(c.transition as string) || 'fade'}
          onChange={(e) => set({ transition: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="fade">Fade</option>
          <option value="none">None</option>
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Object Fit</span>
        <select
          value={(c.objectFit as string) || 'cover'}
          onChange={(e) => set({ objectFit: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </label>
    </>
  );
}

function QRCodeConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ data?: string; label?: string; fgColor?: string; bgColor?: string }>(mod, screenId);

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Data (URL or text)</span>
        <input
          type="text"
          value={(c.data as string) || ''}
          onChange={(e) => set({ data: e.target.value })}
          placeholder="https://example.com"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Label</span>
        <input
          type="text"
          value={(c.label as string) || ''}
          onChange={(e) => set({ label: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <ColorPicker label="QR Color" value={(c.fgColor as string) || '#ffffff'} onChange={(v) => set({ fgColor: v })} />
      <ColorPicker label="Background" value={(c.bgColor as string) || 'transparent'} onChange={(v) => set({ bgColor: v })} />
    </>
  );
}

function YearProgressConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ showYear?: boolean; showMonth?: boolean; showWeek?: boolean; showDay?: boolean; showPercentage?: boolean }>(mod, screenId);

  return (
    <>
      <Toggle label="Show Year" checked={c.showYear !== false} onChange={(v) => set({ showYear: v })} />
      <Toggle label="Show Month" checked={c.showMonth !== false} onChange={(v) => set({ showMonth: v })} />
      <Toggle label="Show Week" checked={c.showWeek !== false} onChange={(v) => set({ showWeek: v })} />
      <Toggle label="Show Day" checked={c.showDay !== false} onChange={(v) => set({ showDay: v })} />
      <Toggle label="Show Percentage" checked={c.showPercentage !== false} onChange={(v) => set({ showPercentage: v })} />
    </>
  );
}

function TrafficConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ routes?: { label: string; origin: string; destination: string }[]; refreshIntervalMs?: number }>(mod, screenId);
  const routes = c.routes ?? [];

  const addRoute = () => {
    set({ routes: [...routes, { label: 'Work', origin: '', destination: '' }] });
  };

  const removeRoute = (idx: number) => {
    set({ routes: routes.filter((_, i) => i !== idx) });
  };

  const updateRoute = (idx: number, updates: Partial<{ label: string; origin: string; destination: string }>) => {
    set({ routes: routes.map((r, i) => (i === idx ? { ...r, ...updates } : r)) });
  };

  return (
    <div className="space-y-2">
      <Slider
        label="Refresh (minutes)"
        value={(c.refreshIntervalMs ?? 300000) / 60000}
        min={1}
        max={30}
        onChange={(v) => set({ refreshIntervalMs: v * 60000 })}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Routes</span>
        <Button size="sm" onClick={addRoute}>Add</Button>
      </div>
      {routes.map((r, idx) => (
        <div key={idx} className="p-2 bg-neutral-800 rounded space-y-1">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={r.label}
              onChange={(e) => updateRoute(idx, { label: e.target.value })}
              placeholder="Label"
              className="flex-1 px-2 py-0.5 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-200"
            />
            <button onClick={() => removeRoute(idx)} className="text-red-400 text-xs px-1">x</button>
          </div>
          <input
            type="text"
            value={r.origin}
            onChange={(e) => updateRoute(idx, { origin: e.target.value })}
            placeholder="Origin address"
            className="w-full px-2 py-0.5 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-200"
          />
          <input
            type="text"
            value={r.destination}
            onChange={(e) => updateRoute(idx, { destination: e.target.value })}
            placeholder="Destination address"
            className="w-full px-2 py-0.5 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-200"
          />
        </div>
      ))}
    </div>
  );
}

function SportsConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ leagues?: string[]; refreshIntervalMs?: number }>(mod, screenId);

  const leagueOptions = ['nfl', 'nba', 'mlb', 'nhl', 'mls', 'epl'];
  const selectedLeagues = c.leagues ?? ['nba', 'nfl'];

  return (
    <>
      <div className="space-y-1">
        <span className="text-xs text-neutral-400">Leagues</span>
        {leagueOptions.map((league) => (
          <Toggle
            key={league}
            label={league.toUpperCase()}
            checked={selectedLeagues.includes(league)}
            onChange={(checked) => {
              const next = checked
                ? [...selectedLeagues, league]
                : selectedLeagues.filter((l) => l !== league);
              set({ leagues: next });
            }}
          />
        ))}
      </div>
      <Slider
        label="Refresh (seconds)"
        value={(c.refreshIntervalMs ?? 60000) / 1000}
        min={30}
        max={600}
        step={30}
        onChange={(v) => set({ refreshIntervalMs: v * 1000 })}
      />
    </>
  );
}

function AirQualityConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ showAQI?: boolean; showPollutants?: boolean; showUV?: boolean; refreshIntervalMs?: number }>(mod, screenId);

  return (
    <>
      <Toggle label="Show AQI" checked={c.showAQI !== false} onChange={(v) => set({ showAQI: v })} />
      <Toggle label="Show Pollutants" checked={!!c.showPollutants} onChange={(v) => set({ showPollutants: v })} />
      <Toggle label="Show UV Index" checked={c.showUV !== false} onChange={(v) => set({ showUV: v })} />
      <Slider
        label="Refresh (minutes)"
        value={(c.refreshIntervalMs ?? 900000) / 60000}
        min={5}
        max={120}
        step={5}
        onChange={(v) => set({ refreshIntervalMs: v * 60000 })}
      />
    </>
  );
}

function TodoistTokenStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/secrets');
        if (res.ok) {
          const data: Record<string, boolean> = await res.json();
          setConfigured(!!data.todoist_token);
        }
      } catch {
        // ignore
      }
    }
    check();
  }, []);

  return (
    <div className="space-y-1">
      <span className="text-xs text-neutral-400">API Token</span>
      {configured === null ? (
        <p className="text-[10px] text-neutral-500">Checking...</p>
      ) : configured ? (
        <span className="flex items-center gap-1.5 text-[10px] text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          Connected
        </span>
      ) : (
        <p className="text-[10px] text-neutral-500">
          Not configured.{' '}
          <a
            href="/editor/settings?tab=integrations"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Settings &rarr; Integrations
          </a>
        </p>
      )}
    </div>
  );
}

function TodoistConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{
    title?: string;
    viewMode?: string;
    groupBy?: string;
    sortBy?: string;
    projectFilter?: string;
    labelFilter?: string;
    showNoDueDate?: boolean;
    showSubtasks?: boolean;
    showLabels?: boolean;
    showProject?: boolean;
    showDescription?: boolean;
    maxTasks?: number;
    refreshIntervalMs?: number;
  }>(mod, screenId);
  const viewMode = c.viewMode ?? 'list';

  return (
    <div className="space-y-3">
      <TodoistTokenStatus />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Title</span>
        <input
          type="text"
          value={(c.title as string) || 'Todoist'}
          onChange={(e) => set({ title: e.target.value })}
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">View Mode</span>
        <select
          value={viewMode}
          onChange={(e) => set({ viewMode: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="list">List</option>
          <option value="board">Board</option>
          <option value="focus">Focus (Today)</option>
        </select>
      </label>
      {viewMode !== 'focus' && (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-400">Group By</span>
          <select
            value={(c.groupBy as string) || 'date'}
            onChange={(e) => set({ groupBy: e.target.value })}
            className={INPUT_CLASS}
          >
            <option value="none">None</option>
            <option value="project">Project</option>
            <option value="priority">Priority</option>
            <option value="date">Due Date</option>
            <option value="label">Label</option>
          </select>
        </label>
      )}
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Sort By</span>
        <select
          value={(c.sortBy as string) || 'default'}
          onChange={(e) => set({ sortBy: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="default">Default Order</option>
          <option value="priority">Priority</option>
          <option value="due_date">Due Date</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Filter Projects (comma-separated)</span>
        <input
          type="text"
          value={(c.projectFilter as string) || ''}
          onChange={(e) => set({ projectFilter: e.target.value })}
          placeholder="e.g. Work, Personal"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Filter Labels (comma-separated)</span>
        <input
          type="text"
          value={(c.labelFilter as string) || ''}
          onChange={(e) => set({ labelFilter: e.target.value })}
          placeholder="e.g. urgent, home"
          className={INPUT_CLASS}
        />
      </label>
      <Toggle label="Show Subtasks" checked={c.showSubtasks !== false} onChange={(v) => set({ showSubtasks: v })} />
      <Toggle label="Show Labels" checked={c.showLabels !== false} onChange={(v) => set({ showLabels: v })} />
      <Toggle label="Show Project" checked={c.showProject !== false} onChange={(v) => set({ showProject: v })} />
      <Toggle label="Show Description" checked={!!c.showDescription} onChange={(v) => set({ showDescription: v })} />
      <Toggle label="Show No-Date Tasks" checked={c.showNoDueDate !== false} onChange={(v) => set({ showNoDueDate: v })} />
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Max Tasks</span>
        <input
          type="number"
          min={1}
          max={100}
          value={c.maxTasks ?? 30}
          onChange={(e) => set({ maxTasks: Number(e.target.value) })}
          className={INPUT_CLASS}
        />
      </label>
      <Slider
        label="Refresh (minutes)"
        value={(c.refreshIntervalMs ?? 300000) / 60000}
        min={5}
        max={30}
        onChange={(v) => set({ refreshIntervalMs: v * 60000 })}
      />
    </div>
  );
}

const CONFIG_SECTIONS: Record<string, React.FC<{ mod: ModuleInstance; screenId: string }>> = {
  clock: ClockConfigSection,
  calendar: CalendarConfigSection,
  weather: WeatherConfigSection,
  countdown: CountdownConfigSection,
  'dad-joke': DadJokeConfigSection,
  text: TextConfigSection,
  image: ImageConfigSection,
  quote: QuoteConfigSection,
  todo: TodoConfigSection,
  'sticky-note': StickyNoteConfigSection,
  greeting: GreetingConfigSection,
  news: NewsConfigSection,
  'stock-ticker': StockTickerConfigSection,
  crypto: CryptoConfigSection,
  history: HistoryConfigSection,
  'moon-phase': MoonPhaseConfigSection,
  'sunrise-sunset': SunriseSunsetConfigSection,
  'photo-slideshow': PhotoSlideshowConfigSection,
  'qr-code': QRCodeConfigSection,
  'year-progress': YearProgressConfigSection,
  traffic: TrafficConfigSection,
  sports: SportsConfigSection,
  'air-quality': AirQualityConfigSection,
  todoist: TodoistConfigSection,
};

export default function PropertyPanel() {
  const { config, selectedScreenId, selectedModuleId, removeModule } = useEditorStore();

  const currentScreen = config?.screens.find((s) => s.id === selectedScreenId);
  const selectedModule = currentScreen?.modules.find((m) => m.id === selectedModuleId);

  if (!selectedModule || !selectedScreenId) {
    return (
      <div className="w-72 flex-shrink-0 bg-neutral-900 border-l border-neutral-700 p-4 overflow-y-auto">
        <p className="text-sm text-neutral-500 mb-5">Select a module to edit</p>
        <BackgroundPicker />
      </div>
    );
  }

  const ConfigSection = CONFIG_SECTIONS[selectedModule.type];

  return (
    <div className="w-72 flex-shrink-0 bg-neutral-900 border-l border-neutral-700 p-4 overflow-y-auto">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200 mb-3">
            {selectedModule.type.charAt(0).toUpperCase() + selectedModule.type.slice(1)} Module
          </h3>
        </div>

        <AccordionSection title="Position & Size">
          <PositionSection mod={selectedModule} screenId={selectedScreenId} />
        </AccordionSection>
        <AccordionSection title="Style" defaultOpen={false}>
          <StyleSection mod={selectedModule} screenId={selectedScreenId} />
        </AccordionSection>

        {ConfigSection && (
          <AccordionSection title="Config">
            <ConfigSection mod={selectedModule} screenId={selectedScreenId} />
          </AccordionSection>
        )}

        <div className="pt-3 border-t border-neutral-700">
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              if (confirm('Delete this module?')) {
                removeModule(selectedScreenId, selectedModule.id);
              }
            }}
          >
            Delete Module
          </Button>
        </div>

        <div className="pt-3 border-t border-neutral-700">
          <BackgroundPicker />
        </div>
      </div>
    </div>
  );
}
