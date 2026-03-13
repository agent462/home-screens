'use client';

import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { useListEditor } from '@/hooks/useListEditor';
import { NESTED_INPUT_CLASS } from '@/components/editor/PropertyPanel';
import type { ModuleInstance, CountdownEvent } from '@/types/config';

export function CountdownConfigSection({ mod, screenId }: { mod: ModuleInstance; screenId: string }) {
  const { config: c, set } = useModuleConfig<{ events?: CountdownEvent[]; scale?: number; showPastEvents?: boolean }>(mod, screenId);
  const events = c.events ?? [];

  const { add: addEvent, remove: removeEvent, update: updateEvent } = useListEditor<CountdownEvent>(
    events,
    'events',
    set,
    { name: 'New Event', date: new Date().toISOString().slice(0, 16) }
  );

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
              className={`flex-1 ${NESTED_INPUT_CLASS}`}
            />
            <button onClick={() => removeEvent(ev.id)} className="text-red-400 text-xs px-1">x</button>
          </div>
          <input
            type="datetime-local"
            value={ev.date.includes('T') ? ev.date.slice(0, 16) : ev.date + 'T00:00'}
            onChange={(e) => updateEvent(ev.id, { date: e.target.value })}
            className={NESTED_INPUT_CLASS}
          />
        </div>
      ))}
    </div>
  );
}
