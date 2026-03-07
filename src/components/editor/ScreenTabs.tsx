'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import Button from '@/components/ui/Button';

export default function ScreenTabs() {
  const { config, selectedScreenId, selectScreen, addScreen, removeScreen, updateScreen } = useEditorStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  if (!config) return null;

  const commitRename = (screenId: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== config.screens.find((s) => s.id === screenId)?.name) {
      updateScreen(screenId, { name: trimmed });
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {config.screens.map((screen) => (
        <div
          key={screen.id}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-t-md text-sm cursor-pointer transition-colors ${
            screen.id === selectedScreenId
              ? 'bg-neutral-800 text-white'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
          }`}
          onClick={() => selectScreen(screen.id)}
          onDoubleClick={() => {
            setEditingId(screen.id);
            setEditValue(screen.name);
          }}
        >
          {editingId === screen.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitRename(screen.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(screen.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-b border-neutral-500 outline-none text-sm text-white w-24"
            />
          ) : (
            <>
              <span>{screen.name}</span>
              {screen.id === selectedScreenId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(screen.id);
                    setEditValue(screen.name);
                  }}
                  className="ml-1 text-neutral-500 hover:text-neutral-200 text-xs"
                  title="Rename screen"
                >
                  &#9998;
                </button>
              )}
            </>
          )}
          {config.screens.length > 1 && editingId !== screen.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove "${screen.name}"?`)) {
                  removeScreen(screen.id);
                }
              }}
              className="ml-1 text-neutral-500 hover:text-red-400 text-xs"
            >
              x
            </button>
          )}
        </div>
      ))}
      <Button size="sm" onClick={addScreen} className="ml-1">
        +
      </Button>
    </div>
  );
}
