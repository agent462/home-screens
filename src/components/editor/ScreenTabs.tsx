'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { useConfirmStore } from '@/stores/confirm-store';
import Button from '@/components/ui/Button';

export default function ScreenTabs() {
  const { config, selectedScreenId, selectScreen, addScreen, removeScreen, updateScreen } = useEditorStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const screenSignature = config?.screens.map((screen) => `${screen.id}:${screen.name}`).join('|') ?? '';

  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(maxScrollLeft > 8 && container.scrollLeft < maxScrollLeft - 8);
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();

    const handleScroll = () => updateScrollState();
    const resizeObserver = new ResizeObserver(() => updateScrollState());

    resizeObserver.observe(container);
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [screenSignature]);

  useEffect(() => {
    const activeTab = scrollContainerRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    activeTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    updateScrollState();
  }, [selectedScreenId, editingId, screenSignature]);

  if (!config) return null;

  const commitRename = (screenId: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== config.screens.find((s) => s.id === screenId)?.name) {
      updateScreen(screenId, { name: trimmed });
    }
    setEditingId(null);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction === 'left' ? -220 : 220,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden px-9"
        >
          {config.screens.map((screen) => (
            <div
              key={screen.id}
              data-active={screen.id === selectedScreenId}
              title={screen.name}
              className={`flex shrink-0 items-center gap-1 rounded-t-md px-3 py-1.5 text-sm cursor-pointer transition-colors ${
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
                  className="w-28 border-b border-neutral-500 bg-transparent text-sm text-white outline-none"
                />
              ) : (
                <>
                  <span className="max-w-32 truncate">{screen.name}</span>
                  {screen.id === selectedScreenId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(screen.id);
                        setEditValue(screen.name);
                      }}
                      className="ml-1 text-xs text-neutral-500 hover:text-neutral-200"
                      title="Rename screen"
                    >
                      &#9998;
                    </button>
                  )}
                </>
              )}
              {config.screens.length > 1 && editingId !== screen.id && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (await useConfirmStore.getState().confirm(`Remove "${screen.name}"?`)) {
                      removeScreen(screen.id);
                    }
                  }}
                  className="ml-1 text-xs text-neutral-500 hover:text-red-400"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
        <div
          className={clsx(
            'pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-transparent transition-opacity',
            canScrollLeft ? 'opacity-100' : 'opacity-0',
          )}
        />
        <button
          type="button"
          onClick={() => scrollTabs('left')}
          disabled={!canScrollLeft}
          aria-label="Scroll tabs left"
          title="Scroll tabs left"
          className={clsx(
            'absolute left-1 top-1/2 -translate-y-1/2 rounded-full border border-neutral-700/80 bg-neutral-950/90 p-1 text-neutral-300 shadow-sm transition-all',
            canScrollLeft ? 'opacity-100 hover:border-neutral-500 hover:text-white' : 'pointer-events-none opacity-0',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          className={clsx(
            'pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-neutral-900 via-neutral-900/95 to-transparent transition-opacity',
            canScrollRight ? 'opacity-100' : 'opacity-0',
          )}
        />
        <button
          type="button"
          onClick={() => scrollTabs('right')}
          disabled={!canScrollRight}
          aria-label="Scroll tabs right"
          title="Scroll tabs right"
          className={clsx(
            'absolute right-1 top-1/2 -translate-y-1/2 rounded-full border border-neutral-700/80 bg-neutral-950/90 p-1 text-neutral-300 shadow-sm transition-all',
            canScrollRight ? 'opacity-100 hover:border-neutral-500 hover:text-white' : 'pointer-events-none opacity-0',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <Button size="sm" onClick={addScreen} className="shrink-0">
        +
      </Button>
    </div>
  );
}
