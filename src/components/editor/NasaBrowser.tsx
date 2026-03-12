'use client';

import { useState, useEffect, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import { useEditorStore } from '@/stores/editor-store';
import Button from '@/components/ui/Button';

interface NasaPhoto {
  id: string;
  title: string;
  description: string;
  date: string;
  thumb: string;
  // APOD-specific
  url?: string;
  hdurl?: string;
  // Image Library-specific
  nasaId?: string;
}

const CATEGORIES = [
  { label: 'Nebula', query: 'nebula' },
  { label: 'Galaxy', query: 'galaxy' },
  { label: 'Earth', query: 'earth from space' },
  { label: 'Mars', query: 'mars surface' },
  { label: 'Moon', query: 'moon' },
  { label: 'Saturn', query: 'saturn rings' },
  { label: 'Jupiter', query: 'jupiter' },
  { label: 'Sun', query: 'sun solar' },
  { label: 'Aurora', query: 'aurora borealis' },
  { label: 'ISS', query: 'international space station' },
];

interface Props {
  selectedScreenId: string;
  hasNasaKey: boolean;
}

export default function NasaBrowser({ selectedScreenId, hasNasaKey }: Props) {
  const [mode, setMode] = useState<'library' | 'apod'>(hasNasaKey ? 'apod' : 'library');
  const [photos, setPhotos] = useState<NasaPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].query);
  const [customSearch, setCustomSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { config, updateScreen } = useEditorStore();

  const fetchPhotos = useCallback(async (query: string, pageNum: number, type: 'library' | 'apod') => {
    setIsLoading(true);
    setError(null);
    try {
      let url: string;
      if (type === 'apod') {
        url = '/api/nasa?type=apod&count=12';
      } else {
        url = `/api/nasa?type=search&query=${encodeURIComponent(query)}&page=${pageNum}`;
      }

      const res = await editorFetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setPhotos([]);
        return;
      }
      setPhotos(data.photos ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError('Failed to fetch NASA images');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'apod') {
      if (hasNasaKey) fetchPhotos('', 1, 'apod');
    } else {
      fetchPhotos(selectedCategory, page, 'library');
    }
  }, [mode, selectedCategory, page, hasNasaKey, fetchPhotos]);

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

  const handleUsePhoto = async (photo: NasaPhoto) => {
    if (!selectedScreenId) return;
    setIsSaving(photo.id);
    setError(null);
    try {
      // For APOD photos, use hdurl; for Image Library, we need to resolve the full-res image
      let imageUrl: string;
      if (photo.hdurl) {
        imageUrl = photo.hdurl;
      } else if (photo.nasaId) {
        // NASA Image Library: resolve full-res from the asset manifest
        const assetRes = await editorFetch(
          `/api/nasa/asset?nasaId=${encodeURIComponent(photo.nasaId)}`
        );
        if (assetRes.ok) {
          const assetData = await assetRes.json();
          imageUrl = assetData.imageUrl || photo.thumb;
        } else {
          imageUrl = photo.thumb;
        }
      } else {
        imageUrl = photo.thumb;
      }

      const res = await editorFetch('/api/nasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          filename: `nasa-${photo.id}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save image');
        setIsSaving(null);
        return;
      }
      if (data.path) {
        const currentScreen = config?.screens.find((s) => s.id === selectedScreenId);
        const updates: Record<string, unknown> = { backgroundImage: data.path };
        if (currentScreen?.backgroundRotation?.enabled) {
          updates.backgroundRotation = { ...currentScreen.backgroundRotation, enabled: false };
        }
        updateScreen(selectedScreenId, updates);
      }
    } catch {
      setError('Failed to save image');
    }
    setIsSaving(null);
  };

  return (
    <>
      <div className="flex gap-1 bg-neutral-800 rounded-md p-0.5">
        <button
          onClick={() => { setMode('apod'); setPage(1); }}
          className={`flex-1 text-[10px] py-1 rounded ${
            mode === 'apod' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-300'
          }`}
        >
          Picture of the Day
        </button>
        <button
          onClick={() => { setMode('library'); setPage(1); }}
          className={`flex-1 text-[10px] py-1 rounded ${
            mode === 'library' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-300'
          }`}
        >
          Image Library
        </button>
      </div>

      {mode === 'library' && (
        <>
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

          <div className="flex gap-1.5">
            <input
              type="text"
              value={customSearch}
              onChange={(e) => setCustomSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
              placeholder="Search NASA images..."
              className="flex-1 rounded-md bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 px-2 py-1.5 focus:outline-none focus:border-blue-500"
            />
            <Button size="sm" onClick={handleCustomSearch}>
              Search
            </Button>
          </div>
        </>
      )}

      {mode === 'apod' && !hasNasaKey && (
        <div className="text-xs text-neutral-500 bg-neutral-800/50 rounded-md p-3 space-y-2">
          <p>Add a free NASA API key in <strong>Settings</strong> to browse Astronomy Picture of the Day.</p>
          <p className="text-neutral-600">Get one at api.nasa.gov</p>
        </div>
      )}

      {mode === 'apod' && hasNasaKey && (
        <Button size="sm" onClick={() => fetchPhotos('', 1, 'apod')} className="self-start">
          Refresh
        </Button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {isLoading ? (
        <div className="text-xs text-neutral-500 py-4 text-center">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => handleUsePhoto(photo)}
              disabled={isSaving === photo.id}
              className="group relative aspect-[9/16] rounded overflow-hidden border border-neutral-700 hover:border-blue-500 transition-colors"
            >
              <img
                src={photo.thumb}
                alt={photo.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <span className="text-[9px] text-white/0 group-hover:text-white/80 px-1.5 pb-1 truncate w-full transition-colors">
                  {photo.title}
                  {photo.date && <span className="block text-white/50">{photo.date.slice(0, 10)}</span>}
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

      {mode === 'library' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="text-[10px] text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <p className="text-[9px] text-neutral-600 text-center">
        Images courtesy of NASA
      </p>
    </>
  );
}
