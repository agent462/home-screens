'use client';

import { useEditorStore } from '@/stores/editor-store';
import Slider from '@/components/ui/Slider';
import Toggle from '@/components/ui/Toggle';
import ColorPicker from '@/components/ui/ColorPicker';
import Button from '@/components/ui/Button';
import BackgroundPicker from '@/components/editor/BackgroundPicker';
import type { ModuleInstance, CountdownEvent, TodoItem } from '@/types/config';
import { v4 as uuidv4 } from 'uuid';

function PositionSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { moveModule, resizeModule } = useEditorStore();
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-neutral-500 uppercase">Position & Size</h4>
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
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
              className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
      <h4 className="text-xs font-semibold text-neutral-500 uppercase">Style</h4>
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
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
  const { updateModule } = useEditorStore();
  const c = mod.config as { format24h?: boolean; showSeconds?: boolean; showDate?: boolean; dateFormat?: string; showWeekNumber?: boolean; showDayOfYear?: boolean };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
      <Toggle label="Show Week Number" checked={!!c.showWeekNumber} onChange={(v) => set({ showWeekNumber: v })} />
      <Toggle label="Show Day of Year" checked={!!c.showDayOfYear} onChange={(v) => set({ showDayOfYear: v })} />
    </>
  );
}

function CalendarConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { daysToShow?: number; showTime?: boolean; showLocation?: boolean };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Days to Show</span>
        <input
          type="number"
          min={1}
          max={14}
          value={c.daysToShow ?? 3}
          onChange={(e) => set({ daysToShow: Number(e.target.value) })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
      <Toggle label="Show Time" checked={c.showTime !== false} onChange={(v) => set({ showTime: v })} />
      <Toggle label="Show Location" checked={!!c.showLocation} onChange={(v) => set({ showLocation: v })} />
    </>
  );
}

function WeatherHourlyConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as {
    hoursToShow?: number;
    showFeelsLike?: boolean;
    showPrecipitation?: boolean;
    showHumidity?: boolean;
    showWind?: boolean;
  };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Hours to Show</span>
        <input
          type="number"
          value={c.hoursToShow ?? 8}
          onChange={(e) => set({ hoursToShow: Number(e.target.value) })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
      <Toggle label="Feels Like" checked={c.showFeelsLike !== false} onChange={(v) => set({ showFeelsLike: v })} />
      <Toggle label="Precipitation" checked={c.showPrecipitation !== false} onChange={(v) => set({ showPrecipitation: v })} />
      <Toggle label="Humidity" checked={!!c.showHumidity} onChange={(v) => set({ showHumidity: v })} />
      <Toggle label="Wind Speed" checked={!!c.showWind} onChange={(v) => set({ showWind: v })} />
    </>
  );
}

function WeatherForecastConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as {
    daysToShow?: number;
    showHighLow?: boolean;
    showPrecipitation?: boolean;
    showPrecipAmount?: boolean;
    showHumidity?: boolean;
    showWind?: boolean;
  };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Days to Show</span>
        <input
          type="number"
          value={c.daysToShow ?? 5}
          onChange={(e) => set({ daysToShow: Number(e.target.value) })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
      <Toggle label="High / Low" checked={c.showHighLow !== false} onChange={(v) => set({ showHighLow: v })} />
      <Toggle label="Precipitation %" checked={!!c.showPrecipitation} onChange={(v) => set({ showPrecipitation: v })} />
      <Toggle label="Precipitation Amount" checked={!!c.showPrecipAmount} onChange={(v) => set({ showPrecipAmount: v })} />
      <Toggle label="Humidity" checked={!!c.showHumidity} onChange={(v) => set({ showHumidity: v })} />
      <Toggle label="Wind Speed" checked={!!c.showWind} onChange={(v) => set({ showWind: v })} />
    </>
  );
}

function CountdownConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { events?: CountdownEvent[]; scale?: number; showPastEvents?: boolean };
  const events = c.events ?? [];
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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
  const { updateModule } = useEditorStore();
  const c = mod.config as { refreshIntervalMs?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">Refresh Interval (ms)</span>
      <input
        type="number"
        value={c.refreshIntervalMs ?? 60000}
        onChange={(e) => set({ refreshIntervalMs: Number(e.target.value) })}
        className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
      />
    </label>
  );
}

function TextConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { content?: string; alignment?: string };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Content</span>
        <textarea
          value={(c.content as string) || ''}
          onChange={(e) => set({ content: e.target.value })}
          rows={3}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200 resize-none"
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Alignment</span>
        <select
          value={(c.alignment as string) || 'center'}
          onChange={(e) => set({ alignment: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
  const { updateModule } = useEditorStore();
  const c = mod.config as { src?: string; objectFit?: string; alt?: string };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Image URL</span>
        <input
          type="text"
          value={(c.src as string) || ''}
          onChange={(e) => set({ src: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Object Fit</span>
        <select
          value={(c.objectFit as string) || 'cover'}
          onChange={(e) => set({ objectFit: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
    </>
  );
}

function QuoteConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { refreshIntervalMs?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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
  const { updateModule } = useEditorStore();
  const c = mod.config as { title?: string; items?: TodoItem[] };
  const items = c.items ?? [];
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
  const { updateModule } = useEditorStore();
  const c = mod.config as { content?: string; noteColor?: string };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Content</span>
        <textarea
          value={(c.content as string) || ''}
          onChange={(e) => set({ content: e.target.value })}
          rows={4}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200 resize-none"
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
  const { updateModule } = useEditorStore();
  const c = mod.config as { name?: string };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">Name</span>
      <input
        type="text"
        value={(c.name as string) || 'Friend'}
        onChange={(e) => set({ name: e.target.value })}
        className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
      />
    </label>
  );
}

function NewsConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { feedUrl?: string; refreshIntervalMs?: number; rotateIntervalMs?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">RSS Feed URL (blank = BBC News)</span>
        <input
          type="text"
          value={(c.feedUrl as string) || ''}
          onChange={(e) => set({ feedUrl: e.target.value })}
          placeholder="https://feeds.bbci.co.uk/news/rss.xml"
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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

function StockTickerConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { symbols?: string; refreshIntervalMs?: number; cardScale?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Symbols (comma-separated)</span>
        <input
          type="text"
          value={(c.symbols as string) || 'AAPL,GOOGL,MSFT'}
          onChange={(e) => set({ symbols: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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

function CryptoConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { ids?: string; refreshIntervalMs?: number; cardScale?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Coin IDs (comma-separated, CoinGecko)</span>
        <input
          type="text"
          value={(c.ids as string) || 'bitcoin,ethereum'}
          onChange={(e) => set({ ids: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
  const { updateModule } = useEditorStore();
  const c = mod.config as { refreshIntervalMs?: number; rotationIntervalSec?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <Slider
        label="Cycle Events (seconds)"
        value={c.rotationIntervalSec ?? 10}
        min={5}
        max={120}
        step={5}
        onChange={(v) => set({ rotationIntervalSec: v })}
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
  const { updateModule } = useEditorStore();
  const c = mod.config as { showIllumination?: boolean; showMoonTimes?: boolean };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <Toggle label="Show Illumination %" checked={c.showIllumination !== false} onChange={(v) => set({ showIllumination: v })} />
      <Toggle label="Show Moon Times" checked={c.showMoonTimes !== false} onChange={(v) => set({ showMoonTimes: v })} />
      <p className="text-xs text-neutral-500">Uses location from global settings.</p>
    </>
  );
}

function SunriseSunsetConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { showDayLength?: boolean; showGoldenHour?: boolean };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <Toggle label="Show Day Length" checked={c.showDayLength !== false} onChange={(v) => set({ showDayLength: v })} />
      <Toggle label="Show Golden Hour" checked={!!c.showGoldenHour} onChange={(v) => set({ showGoldenHour: v })} />
      <p className="text-xs text-neutral-500">Uses location from global settings.</p>
    </>
  );
}

function PhotoSlideshowConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { directory?: string; intervalMs?: number; transition?: string; objectFit?: string };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Directory (subfolder in backgrounds)</span>
        <input
          type="text"
          value={(c.directory as string) || ''}
          onChange={(e) => set({ directory: e.target.value })}
          placeholder="Leave empty for all backgrounds"
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
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
  const { updateModule } = useEditorStore();
  const c = mod.config as { data?: string; label?: string; fgColor?: string; bgColor?: string };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

  return (
    <>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Data (URL or text)</span>
        <input
          type="text"
          value={(c.data as string) || ''}
          onChange={(e) => set({ data: e.target.value })}
          placeholder="https://example.com"
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Label</span>
        <input
          type="text"
          value={(c.label as string) || ''}
          onChange={(e) => set({ label: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
        />
      </label>
      <ColorPicker label="QR Color" value={(c.fgColor as string) || '#ffffff'} onChange={(v) => set({ fgColor: v })} />
      <ColorPicker label="Background" value={(c.bgColor as string) || 'transparent'} onChange={(v) => set({ bgColor: v })} />
    </>
  );
}

function YearProgressConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { updateModule } = useEditorStore();
  const c = mod.config as { showYear?: boolean; showMonth?: boolean; showWeek?: boolean; showDay?: boolean; showPercentage?: boolean };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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
  const { updateModule } = useEditorStore();
  const c = mod.config as { routes?: { label: string; origin: string; destination: string }[]; refreshIntervalMs?: number };
  const routes = c.routes ?? [];
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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
  const { updateModule } = useEditorStore();
  const c = mod.config as { leagues?: string[]; refreshIntervalMs?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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
  const { updateModule } = useEditorStore();
  const c = mod.config as { showAQI?: boolean; showPollutants?: boolean; showUV?: boolean; refreshIntervalMs?: number };
  const set = (updates: Record<string, unknown>) =>
    updateModule(screenId, mod.id, { config: { ...mod.config, ...updates } });

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

const CONFIG_SECTIONS: Record<string, React.FC<{ mod: ModuleInstance; screenId: string }>> = {
  clock: ClockConfigSection,
  calendar: CalendarConfigSection,
  'weather-hourly': WeatherHourlyConfigSection,
  'weather-forecast': WeatherForecastConfigSection,
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

        <PositionSection mod={selectedModule} screenId={selectedScreenId} />
        <StyleSection mod={selectedModule} screenId={selectedScreenId} />

        {ConfigSection && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase">Config</h4>
            <ConfigSection mod={selectedModule} screenId={selectedScreenId} />
          </div>
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
