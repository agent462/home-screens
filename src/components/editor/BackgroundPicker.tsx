'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import type { BackgroundRotation } from '@/types/config';
import Button from '@/components/ui/Button';

interface UnsplashPhoto {
  id: string;
  description: string;
  thumb: string;
  small: string;
  regular: string;
  full: string;
  raw: string;
  authorName: string;
  authorUrl: string;
  downloadUrl: string;
}

const CATEGORIES = [
  { label: 'Nature', query: 'nature landscape' },
  { label: 'Mountains', query: 'mountains scenic' },
  { label: 'Ocean', query: 'ocean sea coast' },
  { label: 'Forest', query: 'forest trees' },
  { label: 'Sky', query: 'sky clouds sunset' },
  { label: 'Space', query: 'space galaxy nebula' },
  { label: 'City', query: 'city skyline night' },
  { label: 'Abstract', query: 'abstract gradient dark' },
  { label: 'Flowers', query: 'flowers botanical' },
  { label: 'Seasons', query: 'seasons autumn winter' },
];

export default function BackgroundPicker() {
  const [localBackgrounds, setLocalBackgrounds] = useState<string[]>([]);
  const [unsplashPhotos, setUnsplashPhotos] = useState<UnsplashPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].query);
  const [customSearch, setCustomSearch] = useState('');
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState<'local' | 'unsplash'>('unsplash');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { config, selectedScreenId, updateScreen } = useEditorStore();

  const currentScreen = config?.screens.find((s) => s.id === selectedScreenId);
  const hasUnsplashKey = !!config?.settings?.unsplashAccessKey;

  // Fetch local backgrounds
  useEffect(() => {
    fetch('/api/backgrounds')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLocalBackgrounds(data);
      })
      .catch(() => {});
  }, []);

  // Fetch Unsplash photos
  const searchUnsplash = useCallback(async (query: string, pageNum: number) => {
    setIsLoading(true);
    setUnsplashError(null);
    try {
      const res = await fetch(
        `/api/unsplash?query=${encodeURIComponent(query)}&page=${pageNum}&per_page=12&orientation=portrait`
      );
      const data = await res.json();
      if (!res.ok) {
        setUnsplashError(data.error);
        setUnsplashPhotos([]);
        return;
      }
      setUnsplashPhotos(data.photos ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setUnsplashError('Failed to search Unsplash');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'unsplash' && hasUnsplashKey) {
      searchUnsplash(selectedCategory, page);
    }
  }, [tab, selectedCategory, page, hasUnsplashKey, searchUnsplash]);

  const handleCategoryChange = (query: string) => {
    setSelectedCategory(query);
    setPage(1);
    setCustomSearch('');
  };

  const handleCustomSearch = () => {
    if (!customSearch.trim()) return;
    setSelectedCategory(customSearch.trim());
    setPage(1);
  };

  // Download Unsplash photo and save locally
  const handleUsePhoto = async (photo: UnsplashPhoto) => {
    if (!selectedScreenId) return;
    setIsSaving(photo.id);
    try {
      // Use the "regular" size (1080px width, good for portrait display)
      const res = await fetch('/api/unsplash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: photo.regular,
          downloadUrl: photo.downloadUrl,
          filename: `unsplash-${photo.id}`,
        }),
      });
      const data = await res.json();
      if (data.path) {
        setLocalBackgrounds((prev) => prev.includes(data.path) ? prev : [...prev, data.path]);
        updateScreen(selectedScreenId, { backgroundImage: data.path });
      }
    } catch {
      // ignore
    }
    setIsSaving(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/backgrounds', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.path) {
        setLocalBackgrounds((prev) => [...prev, data.path]);
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!currentScreen || !selectedScreenId) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-neutral-500 uppercase">Background</h4>

      {/* Auto-rotate */}
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

      {/* Tabs */}
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
        <>
          {!hasUnsplashKey ? (
            <div className="text-xs text-neutral-500 bg-neutral-800/50 rounded-md p-3 space-y-2">
              <p>Add a free Unsplash API key in <strong>Settings</strong> to browse thousands of HD backgrounds.</p>
              <p className="text-neutral-600">
                Get one at unsplash.com/developers
              </p>
            </div>
          ) : (
            <>
              {/* Categories */}
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.query}
                    onClick={() => handleCategoryChange(cat.query)}
                    className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                      selectedCategory === cat.query
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Custom search */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
                  placeholder="Search anything..."
                  className="flex-1 rounded-md bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                />
                <Button size="sm" onClick={handleCustomSearch}>
                  Search
                </Button>
              </div>

              {/* Error */}
              {unsplashError && (
                <p className="text-xs text-red-400">{unsplashError}</p>
              )}

              {/* Photo grid */}
              {isLoading ? (
                <div className="text-xs text-neutral-500 py-4 text-center">Loading...</div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto">
                  {unsplashPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => handleUsePhoto(photo)}
                      disabled={isSaving === photo.id}
                      className="group relative aspect-[9/16] rounded overflow-hidden border border-neutral-700 hover:border-blue-500 transition-colors"
                    >
                      <img
                        src={photo.thumb}
                        alt={photo.description}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                        <span className="text-[9px] text-white/0 group-hover:text-white/80 px-1.5 pb-1 truncate w-full transition-colors">
                          {photo.authorName}
                        </span>
                      </div>
                      {isSaving === photo.id && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-xs text-white">Saving...</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <span className="text-[10px] text-neutral-500">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}

              <p className="text-[9px] text-neutral-600 text-center">
                Photos by Unsplash
              </p>
            </>
          )}
        </>
      )}

      {tab === 'local' && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => updateScreen(selectedScreenId, { backgroundImage: '' })}
              className={`aspect-video rounded border text-xs text-neutral-500 ${
                !currentScreen.backgroundImage ? 'border-blue-500' : 'border-neutral-600'
              }`}
            >
              None
            </button>
            {localBackgrounds.map((bg) => (
              <button
                key={bg}
                onClick={() => updateScreen(selectedScreenId, { backgroundImage: bg })}
                className={`aspect-video rounded border overflow-hidden ${
                  currentScreen.backgroundImage === bg ? 'border-blue-500' : 'border-neutral-600'
                }`}
              >
                <img src={bg} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-full">
            {isLoading ? 'Uploading...' : 'Upload Background'}
          </Button>
        </>
      )}
    </div>
  );
}
