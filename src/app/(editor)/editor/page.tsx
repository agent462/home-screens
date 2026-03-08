'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEditorStore } from '@/stores/editor-store';
import { DEFAULT_DISPLAY_WIDTH, DEFAULT_DISPLAY_HEIGHT, DEFAULT_MODULE_SIZES, snapToGrid } from '@/lib/constants';
import { getModuleDefinition } from '@/lib/module-registry';
import type { ModuleType } from '@/types/config';

import ScreenTabs from '@/components/editor/ScreenTabs';
import ModulePalette from '@/components/editor/ModulePalette';
import EditorCanvas from '@/components/editor/EditorCanvas';
import PropertyPanel from '@/components/editor/PropertyPanel';
import SettingsPanel from '@/components/editor/SettingsPanel';
import SystemPanel from '@/components/editor/SystemPanel';
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
  const [showSystem, setShowSystem] = useState(false);
  const [activePaletteType, setActivePaletteType] = useState<string | null>(null);
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.source === 'palette') {
      setActivePaletteType(data.moduleType as string);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActivePaletteType(null);
      const { active, over, delta, activatorEvent } = event;
      if (!selectedScreenId || !over) return;

      const data = active.data.current;

      const displayW = config?.settings.displayWidth || DEFAULT_DISPLAY_WIDTH;
      const displayH = config?.settings.displayHeight || DEFAULT_DISPLAY_HEIGHT;

      if (data?.source === 'palette' && over.id === 'canvas-drop') {
        const scale = canvasScaleRef.current;
        const moduleType = data.moduleType as string;
        const defaultSize = DEFAULT_MODULE_SIZES[moduleType] || { w: 200, h: 200 };
        // Compute pointer position relative to the canvas droppable
        const pointerEvent = activatorEvent as PointerEvent;
        const pointerX = pointerEvent.clientX + delta.x;
        const pointerY = pointerEvent.clientY + delta.y;
        const canvasRect = over.rect;
        const rawX = (pointerX - canvasRect.left) / scale - defaultSize.w / 2;
        const rawY = (pointerY - canvasRect.top) / scale - defaultSize.h / 2;
        const dropX = snapToGrid(Math.max(0, Math.min(displayW - defaultSize.w, rawX)));
        const dropY = snapToGrid(Math.max(0, Math.min(displayH - defaultSize.h, rawY)));
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActivePaletteType(null)}>
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
              onClick={() => setShowSystem(true)}
            >
              System
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
      {showSystem && <SystemPanel onClose={() => setShowSystem(false)} />}
      <DragOverlay dropAnimation={null}>
        {activePaletteType && (() => {
          const def = getModuleDefinition(activePaletteType as ModuleType);
          if (!def) return null;
          return (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-800 border border-blue-500 shadow-lg shadow-blue-500/20 cursor-grabbing">
              <def.icon className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-neutral-200">{def.label}</span>
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}
