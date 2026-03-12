'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { useConfirmStore } from '@/stores/confirm-store';
import Slider from '@/components/ui/Slider';
import ColorPicker from '@/components/ui/ColorPicker';
import Button from '@/components/ui/Button';
import BackgroundPicker from '@/components/editor/BackgroundPicker';
import { ScheduleSection } from '@/components/editor/ScheduleSection';
import type { ModuleInstance } from '@/types/config';

import {
  ClockConfigSection,
  CalendarConfigSection,
  WeatherConfigSection,
  CountdownConfigSection,
  DadJokeConfigSection,
  TextConfigSection,
  ImageConfigSection,
  QuoteConfigSection,
  TodoConfigSection,
  StickyNoteConfigSection,
  GreetingConfigSection,
  NewsConfigSection,
  StockTickerConfigSection,
  CryptoConfigSection,
  HistoryConfigSection,
  MoonPhaseConfigSection,
  SunriseSunsetConfigSection,
  PhotoSlideshowConfigSection,
  QRCodeConfigSection,
  YearProgressConfigSection,
  TrafficConfigSection,
  SportsConfigSection,
  AirQualityConfigSection,
  TodoistConfigSection,
  RainMapConfigSection,
  GarbageDayConfigSection,
  MultiMonthConfigSection,
  StandingsConfigSection,
  AffirmationsConfigSection,
  DateConfigSection,
} from '@/components/editor/config-sections';

// Shared constants — exported for use by config section components
export const INPUT_CLASS = 'w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200';

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
  'rain-map': RainMapConfigSection,
  'multi-month': MultiMonthConfigSection,
  'garbage-day': GarbageDayConfigSection,
  standings: StandingsConfigSection,
  affirmations: AffirmationsConfigSection,
  date: DateConfigSection,
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

        <AccordionSection title="Schedule" defaultOpen={false}>
          <ScheduleSection mod={selectedModule} screenId={selectedScreenId} />
        </AccordionSection>

        <div className="pt-3 border-t border-neutral-700">
          <Button
            variant="danger"
            className="w-full"
            onClick={async () => {
              if (await useConfirmStore.getState().confirm('Delete this module?')) {
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
