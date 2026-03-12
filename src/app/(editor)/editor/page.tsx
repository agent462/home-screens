'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Check, AlertCircle } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { useAutoSave } from '@/hooks/useAutoSave';
import { DEFAULT_DISPLAY_WIDTH, DEFAULT_DISPLAY_HEIGHT, DEFAULT_MODULE_SIZES, snapToGrid } from '@/lib/constants';
import { getModuleDefinition } from '@/lib/module-registry';
import type { ModuleType } from '@/types/config';

import ScreenTabs from '@/components/editor/ScreenTabs';
import ModulePalette from '@/components/editor/ModulePalette';
import EditorCanvas from '@/components/editor/EditorCanvas';
import PropertyPanel from '@/components/editor/PropertyPanel';
import HomeScreensLogo from '@/components/brand/HomeScreensLogo';
import Button from '@/components/ui/Button';

export default function EditorPage() {
  const {
    config,
    selectedScreenId,
    loadConfig,
    addModule,
    moveModule,
  } = useEditorStore();

  const { isDirty, isSaving, saveError, saveConfig } = useAutoSave();

  const [activePaletteType, setActivePaletteType] = useState<string | null>(null);
  const router = useRouter();
  const canvasScaleRef = useRef(0.4);

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
    <DndContext sensors={sensors} autoScroll={false} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActivePaletteType(null)}>
      <div className="h-screen flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-4 overflow-hidden border-b border-neutral-700 bg-neutral-900 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
            <HomeScreensLogo contextLabel="Editor" />
            <div className="h-8 w-px bg-neutral-800" />
            <ScreenTabs />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                if (isDirty) await saveConfig();
                router.push('/editor/settings');
              }}
            >
              Settings
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open('/display', '_blank')}
            >
              Preview
            </Button>
            <div className="min-w-24 flex items-center justify-end gap-1.5">
              {saveError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-red-400">Save failed</span>
                  <Button variant="secondary" size="sm" onClick={saveConfig}>
                    Retry
                  </Button>
                </>
              ) : isSaving ? (
                <span className="text-xs text-neutral-500">Saving...</span>
              ) : !isDirty ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-500">Saved</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          <ModulePalette />
          <EditorCanvas onScaleChange={(s) => { canvasScaleRef.current = s; }} />
          <PropertyPanel />
        </div>
      </div>
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
