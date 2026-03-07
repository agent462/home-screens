'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useDroppable, useDraggable, useDndMonitor } from '@dnd-kit/core';
import { useEditorStore } from '@/stores/editor-store';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT, GRID_SIZE, snapToGrid } from '@/lib/constants';
import { getModuleDefinition } from '@/lib/module-registry';
import { moduleComponents } from '@/lib/module-components';
import type { ModuleInstance } from '@/types/config';

function ModulePreview({ mod, previewData }: { mod: ModuleInstance; previewData: PreviewData }) {
  const Component = moduleComponents[mod.type];
  if (!Component) return null;

  const extraProps: Record<string, unknown> = {};
  if (mod.type === 'weather-hourly') {
    extraProps.data = previewData.weatherHourly;
  } else if (mod.type === 'weather-forecast') {
    extraProps.data = previewData.weatherForecast;
  } else if (mod.type === 'calendar') {
    extraProps.events = previewData.calendarEvents;
  }

  return <Component config={mod.config} style={mod.style} {...extraProps} />;
}

interface PreviewData {
  weatherHourly: unknown[] | null;
  weatherForecast: unknown[] | null;
  calendarEvents: unknown[] | null;
}

function DraggableModule({
  mod,
  scale,
  isSelected,
  onSelect,
  onResize,
  previewData,
}: {
  mod: ModuleInstance;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onResize: (size: { w: number; h: number }) => void;
  previewData: PreviewData;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `module-${mod.id}`,
    data: { source: 'canvas', moduleId: mod.id },
  });

  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: mod.size.w,
        startH: mod.size.h,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = (ev.clientX - resizeRef.current.startX) / scale;
        const dy = (ev.clientY - resizeRef.current.startY) / scale;
        onResize({
          w: Math.max(GRID_SIZE * 2, snapToGrid(Math.round(resizeRef.current.startW + dx))),
          h: Math.max(GRID_SIZE * 2, snapToGrid(Math.round(resizeRef.current.startH + dy))),
        });
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [mod.size, scale, onResize],
  );

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`absolute ${isDragging ? 'opacity-60' : ''}`}
      style={{
        left: mod.position.x * scale,
        top: mod.position.y * scale,
        width: mod.size.w * scale,
        height: mod.size.h * scale,
        zIndex: mod.zIndex,
      }}
    >
      {/* Live preview: render module at native size, scale down with CSS */}
      <div
        {...listeners}
        className={`w-full h-full overflow-hidden transition-shadow cursor-grab ${
          isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : ''
        }`}
        style={{ borderRadius: mod.style.borderRadius * scale }}
      >
        <div
          style={{
            width: mod.size.w,
            height: mod.size.h,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <ModulePreview mod={mod} previewData={previewData} />
        </div>
      </div>
      {/* Type label overlay */}
      <div className="absolute top-0 left-0 px-1.5 py-0.5 bg-black/50 rounded-br text-white" style={{ fontSize: Math.max(7, 9 * scale) }}>
        {getModuleDefinition(mod.type)?.label || mod.type}
      </div>
      {isSelected && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize rounded-tl"
          style={{ zIndex: 999 }}
        />
      )}
    </div>
  );
}

function GridOverlay({ scale }: { scale: number }) {
  const scaledGrid = GRID_SIZE * scale;
  // Only show grid if cells are large enough to be visible
  if (scaledGrid < 6) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <defs>
        <pattern
          id="editor-grid"
          width={scaledGrid}
          height={scaledGrid}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={scaledGrid} cy={scaledGrid} r={0.5} fill="rgba(255,255,255,0.15)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#editor-grid)" />
    </svg>
  );
}

function DragGhost({
  mod,
  scale,
  deltaX,
  deltaY,
}: {
  mod: ModuleInstance;
  scale: number;
  deltaX: number;
  deltaY: number;
}) {
  const rawX = mod.position.x + deltaX / scale;
  const rawY = mod.position.y + deltaY / scale;
  const snappedX = snapToGrid(Math.max(0, Math.min(DISPLAY_WIDTH - mod.size.w, rawX)));
  const snappedY = snapToGrid(Math.max(0, Math.min(DISPLAY_HEIGHT - mod.size.h, rawY)));

  return (
    <div
      className="absolute border-2 border-blue-400 border-dashed rounded pointer-events-none"
      style={{
        left: snappedX * scale,
        top: snappedY * scale,
        width: mod.size.w * scale,
        height: mod.size.h * scale,
        zIndex: 9999,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      }}
    >
      <div className="absolute -top-5 left-0 text-[10px] text-blue-400 whitespace-nowrap font-mono">
        {snappedX}, {snappedY}
      </div>
    </div>
  );
}

export default function EditorCanvas({ onScaleChange }: { onScaleChange?: (scale: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const { config, selectedScreenId, selectedModuleId, selectModule, resizeModule } = useEditorStore();
  const [previewData, setPreviewData] = useState<PreviewData>({
    weatherHourly: null,
    weatherForecast: null,
    calendarEvents: null,
  });
  const [dragState, setDragState] = useState<{
    moduleId: string;
    deltaX: number;
    deltaY: number;
  } | null>(null);

  const { setNodeRef } = useDroppable({ id: 'canvas-drop' });

  useDndMonitor({
    onDragStart(event) {
      const data = event.active.data.current;
      if (data?.source === 'canvas') {
        setDragState({ moduleId: data.moduleId as string, deltaX: 0, deltaY: 0 });
      }
    },
    onDragMove(event) {
      const data = event.active.data.current;
      if (data?.source === 'canvas') {
        setDragState({
          moduleId: data.moduleId as string,
          deltaX: event.delta.x,
          deltaY: event.delta.y,
        });
      }
    },
    onDragEnd() {
      setDragState(null);
    },
    onDragCancel() {
      setDragState(null);
    },
  });

  const currentScreen = config?.screens.find((s) => s.id === selectedScreenId);
  const [rotatingBg, setRotatingBg] = useState<string | null>(null);

  // Fetch background rotation preview
  useEffect(() => {
    const rotation = currentScreen?.backgroundRotation;
    if (!rotation?.enabled || !rotation.query) {
      setRotatingBg(null);
      return;
    }

    let mounted = true;
    async function fetchBg() {
      try {
        const res = await fetch(`/api/unsplash/random?query=${encodeURIComponent(rotation!.query)}`);
        if (res.ok && mounted) {
          const data = await res.json();
          if (data.url) setRotatingBg(data.url);
        }
      } catch {
        // ignore
      }
    }
    fetchBg();
    return () => { mounted = false; };
  }, [currentScreen?.id, currentScreen?.backgroundRotation?.enabled, currentScreen?.backgroundRotation?.query]);

  // Fetch live data for previews
  useEffect(() => {
    async function fetchPreviewData() {
      try {
        const res = await fetch('/api/weather');
        if (res.ok) {
          const data = await res.json();
          setPreviewData((prev) => ({
            ...prev,
            weatherHourly: data.hourly ?? null,
            weatherForecast: data.forecast ?? null,
          }));
        }
      } catch {
        // ignore
      }
      try {
        const calRes = await fetch('/api/calendar');
        if (calRes.ok) {
          const calData = await calRes.json();
          const events = Array.isArray(calData.events) ? calData.events : Array.isArray(calData) ? calData : [];
          setPreviewData((prev) => ({
            ...prev,
            calendarEvents: events,
          }));
        }
      } catch {
        // ignore
      }
    }
    fetchPreviewData();
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleX = (clientWidth - 32) / DISPLAY_WIDTH;
      const scaleY = (clientHeight - 32) / DISPLAY_HEIGHT;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
      onScaleChange?.(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  if (!currentScreen) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500">
        No screen selected
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center bg-neutral-950 overflow-hidden p-4">
      <div
        ref={setNodeRef}
        className="relative bg-neutral-900 border border-neutral-700 overflow-hidden"
        style={{
          width: DISPLAY_WIDTH * scale,
          height: DISPLAY_HEIGHT * scale,
          borderRadius: 8,
        }}
        onClick={() => selectModule(null)}
      >
        {(currentScreen.backgroundImage || rotatingBg) && (
          <img
            src={currentScreen.backgroundRotation?.enabled ? (rotatingBg || currentScreen.backgroundImage) : currentScreen.backgroundImage || ''}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <GridOverlay scale={scale} />
        {currentScreen.modules.map((mod) => (
          <DraggableModule
            key={mod.id}
            mod={mod}
            scale={scale}
            isSelected={mod.id === selectedModuleId}
            onSelect={() => selectModule(mod.id)}
            onResize={(size) => resizeModule(selectedScreenId!, mod.id, size)}
            previewData={previewData}
          />
        ))}
        {dragState && (() => {
          const mod = currentScreen.modules.find((m) => m.id === dragState.moduleId);
          return mod ? (
            <DragGhost
              mod={mod}
              scale={scale}
              deltaX={dragState.deltaX}
              deltaY={dragState.deltaY}
            />
          ) : null;
        })()}
      </div>
    </div>
  );
}
