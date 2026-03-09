'use client';

import { useState, useEffect, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import { useEditorStore } from '@/stores/editor-store';
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

interface Props {
  selectedScreenId: string;
  hasUnsplashKey: boolean;
}

export default function UnsplashBrowser({ selectedScreenId, hasUnsplashKey }: Props) {
  const [unsplashPhotos, setUnsplashPhotos] = useState<UnsplashPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].query);
  const [customSearch, setCustomSearch] = useState('');
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { updateScreen } = useEditorStore();

  const searchUnsplash = useCallback(async (query: string, pageNum: number) => {
    setIsLoading(true);
    setUnsplashError(null);
    try {
      const res = await editorFetch(
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
    if (hasUnsplashKey) {
      searchUnsplash(selectedCategory, page);
    }
  }, [selectedCategory, page, hasUnsplashKey, searchUnsplash]);

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

  const handleUsePhoto = async (photo: UnsplashPhoto) => {
    if (!selectedScreenId) return;
    setIsSaving(photo.id);
    try {
      const res = await editorFetch('/api/unsplash', {
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
        updateScreen(selectedScreenId, { backgroundImage: data.path });
      }
    } catch {
      // ignore
    }
    setIsSaving(null);
  };

  if (!hasUnsplashKey) {
    return (
      <div className="text-xs text-neutral-500 bg-neutral-800/50 rounded-md p-3 space-y-2">
        <p>Add a free Unsplash API key in <strong>Settings</strong> to browse thousands of HD backgrounds.</p>
        <p className="text-neutral-600">
          Get one at unsplash.com/developers
        </p>
      </div>
    );
  }

  return (
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
          placeholder="Search anything..."
          className="flex-1 rounded-md bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 px-2 py-1.5 focus:outline-none focus:border-blue-500"
        />
        <Button size="sm" onClick={handleCustomSearch}>
          Search
        </Button>
      </div>

      {unsplashError && (
        <p className="text-xs text-red-400">{unsplashError}</p>
      )}

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
  );
}
