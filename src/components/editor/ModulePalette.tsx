'use client';

import { useDraggable } from '@dnd-kit/core';
import { getAllModuleDefinitions } from '@/lib/module-registry';
import type { ModuleDefinition } from '@/lib/module-registry';

function PaletteItem({ definition }: { definition: ModuleDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}`,
    data: { source: 'palette', moduleType: definition.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 cursor-grab hover:border-neutral-500 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <definition.icon className="w-5 h-5 text-neutral-400" />
      <span className="text-sm text-neutral-200">{definition.label}</span>
    </div>
  );
}

export default function ModulePalette() {
  const definitions = getAllModuleDefinitions();

  return (
    <div className="w-56 flex-shrink-0 bg-neutral-900 border-r border-neutral-700 p-3 flex flex-col gap-2 overflow-y-auto">
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
        Modules
      </h3>
      {definitions.map((def) => (
        <PaletteItem key={def.type} definition={def} />
      ))}
    </div>
  );
}
