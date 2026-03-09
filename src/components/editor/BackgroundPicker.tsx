'use client';

import { useState, useEffect } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import { useEditorStore } from '@/stores/editor-store';
import type { BackgroundRotation } from '@/types/config';
import LocalBackgrounds from './LocalBackgrounds';
import UnsplashBrowser from './UnsplashBrowser';

export default function BackgroundPicker() {
  const [tab, setTab] = useState<'local' | 'unsplash'>('unsplash');
  const { config, selectedScreenId, updateScreen } = useEditorStore();
  const [hasUnsplashKey, setHasUnsplashKey] = useState(false);

  const currentScreen = config?.screens.find((s) => s.id === selectedScreenId);

  useEffect(() => {
    async function checkKey() {
      try {
        const res = await editorFetch('/api/secrets');
        if (res.ok) {
          const data: Record<string, boolean> = await res.json();
          setHasUnsplashKey(!!data.unsplash_access_key);
        }
      } catch {
        // ignore
      }
    }
    checkKey();
  }, []);

  if (!currentScreen || !selectedScreenId) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-neutral-500 uppercase">Background</h4>

      {hasUnsplashKey && (
        <div className="bg-neutral-800/50 rounded-md p-2.5 space-y-2">
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-xs text-neutral-400">Auto-rotate from Unsplash</span>
            <button
              type="button"
              role="switch"
              aria-checked={currentScreen?.backgroundRotation?.enabled ?? false}
              onClick={() => {
                if (!selectedScreenId) return;
                const current = currentScreen?.backgroundRotation;
                const updated: BackgroundRotation = {
                  enabled: !current?.enabled,
                  query: current?.query || 'nature landscape',
                  intervalMinutes: current?.intervalMinutes || 60,
                };
                updateScreen(selectedScreenId, { backgroundRotation: updated });
              }}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                currentScreen?.backgroundRotation?.enabled ? 'bg-blue-600' : 'bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  currentScreen?.backgroundRotation?.enabled ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </label>
          {currentScreen?.backgroundRotation?.enabled && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-[10px] text-neutral-500">Search query</span>
                <input
                  type="text"
                  value={currentScreen.backgroundRotation.query}
                  onChange={(e) => {
                    if (!selectedScreenId) return;
                    updateScreen(selectedScreenId, {
                      backgroundRotation: { ...currentScreen.backgroundRotation!, query: e.target.value },
                    });
                  }}
                  placeholder="nature landscape"
                  className="mt-0.5 block w-full rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 px-2 py-1 focus:outline-none focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-neutral-500">Rotate every</span>
                <select
                  value={currentScreen.backgroundRotation.intervalMinutes}
                  onChange={(e) => {
                    if (!selectedScreenId) return;
                    updateScreen(selectedScreenId, {
                      backgroundRotation: { ...currentScreen.backgroundRotation!, intervalMinutes: Number(e.target.value) },
                    });
                  }}
                  className="mt-0.5 block w-full rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 px-2 py-1 focus:outline-none focus:border-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>8 hours</option>
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1 bg-neutral-800 rounded-md p-0.5">
        <button
          onClick={() => setTab('unsplash')}
          className={`flex-1 text-xs py-1.5 rounded ${
            tab === 'unsplash' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-300'
          }`}
        >
          Unsplash
        </button>
        <button
          onClick={() => setTab('local')}
          className={`flex-1 text-xs py-1.5 rounded ${
            tab === 'local' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-300'
          }`}
        >
          Local
        </button>
      </div>

      {tab === 'unsplash' && (
        <UnsplashBrowser selectedScreenId={selectedScreenId} hasUnsplashKey={hasUnsplashKey} />
      )}

      {tab === 'local' && (
        <LocalBackgrounds selectedScreenId={selectedScreenId} />
      )}
    </div>
  );
}
