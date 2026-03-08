'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEditorStore } from '@/stores/editor-store';
import { DEFAULT_DISPLAY_WIDTH, DEFAULT_DISPLAY_HEIGHT, snapToGrid } from '@/lib/constants';
import type { ModuleType } from '@/types/config';

import ScreenTabs from '@/components/editor/ScreenTabs';
import ModulePalette from '@/components/editor/ModulePalette';
import EditorCanvas from '@/components/editor/EditorCanvas';
import PropertyPanel from '@/components/editor/PropertyPanel';
import SettingsPanel from '@/components/editor/SettingsPanel';
import Button from '@/components/ui/Button';

export default function EditorPage() {
  const {
    config,
    isDirty,
    isSaving,
    selectedScreenId,
    loadConfig,
    saveConfig,
    addModule,
    moveModule,
    exportConfig,
    importConfig,
  } = useEditorStore();

  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasScaleRef = useRef(0.4);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importConfig(reader.result as string);
      } catch {
        alert('Invalid config file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importConfig]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta } = event;
      if (!selectedScreenId || !over) return;

      const data = active.data.current;

      const displayW = config?.settings.displayWidth || DEFAULT_DISPLAY_WIDTH;
      const displayH = config?.settings.displayHeight || DEFAULT_DISPLAY_HEIGHT;

      if (data?.source === 'palette' && over.id === 'canvas-drop') {
        const scale = canvasScaleRef.current;
        const rawX = delta.x / scale;
        const rawY = delta.y / scale;
        const dropX = snapToGrid(Math.max(0, Math.min(displayW - 200, rawX + 100)));
        const dropY = snapToGrid(Math.max(0, Math.min(displayH - 200, rawY + 100)));
        addModule(selectedScreenId, data.moduleType as ModuleType, { x: dropX, y: dropY });
      } else if (data?.source === 'canvas') {
        const moduleId = data.moduleId as string;
        const screen = config?.screens.find((s) => s.id === selectedScreenId);
        const mod = screen?.modules.find((m) => m.id === moduleId);
        if (!mod) return;

        const scale = canvasScaleRef.current;

        const rawX = mod.position.x + delta.x / scale;
        const rawY = mod.position.y + delta.y / scale;
        const newX = snapToGrid(Math.max(0, Math.min(displayW - mod.size.w, rawX)));
        const newY = snapToGrid(Math.max(0, Math.min(displayH - mod.size.h, rawY)));
        moveModule(selectedScreenId, moduleId, { x: newX, y: newY });
      }
    },
    [selectedScreenId, config, addModule, moveModule],
  );

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-500">
        Loading...
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-700 bg-neutral-900 px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-neutral-300">Home Screen Editor</span>
            <ScreenTabs />
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Import Config
            </Button>
            <Button variant="secondary" onClick={exportConfig}>
              Export Config
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open('/display', '_blank')}
            >
              Preview
            </Button>
            <Button
              variant="primary"
              onClick={saveConfig}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          <ModulePalette />
          <EditorCanvas onScaleChange={(s) => { canvasScaleRef.current = s; }} />
          <PropertyPanel />
        </div>
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </DndContext>
  );
}
