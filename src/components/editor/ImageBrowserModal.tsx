'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import Button from '@/components/ui/Button';

interface DirectoryInfo {
  name: string;
  path: string;
  imageCount: number;
}

interface ImageBrowserModalProps {
  mode: 'pick-image' | 'manage-directory';
  initialDirectory?: string;
  onSelectImage?: (serveUrl: string) => void;
  onSelectDirectory?: (directoryPath: string) => void;
  onClose: () => void;
}

export default function ImageBrowserModal({
  mode,
  initialDirectory = '',
  onSelectImage,
  onSelectDirectory,
  onClose,
}: ImageBrowserModalProps) {
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [selectedDir, setSelectedDir] = useState(initialDirectory);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingDirs, setLoadingDirs] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const fetchIdRef = useRef(0);

  // Fetch directories
  const fetchDirectories = useCallback(async () => {
    setLoadingDirs(true);
    try {
      const res = await editorFetch('/api/backgrounds/directories');
      if (res.ok) {
        const data = await res.json();
        setDirectories(data.directories ?? []);
      }
    } catch {
      // ignore
    }
    setLoadingDirs(false);
  }, []);

  // Fetch images for selected directory (with stale-response guard)
  const fetchImages = useCallback(async (dir: string, preserveError = false) => {
    const id = ++fetchIdRef.current;
    setLoadingImages(true);
    if (!preserveError) setError(null);
    try {
      const url = dir
        ? `/api/backgrounds?directory=${encodeURIComponent(dir)}`
        : '/api/backgrounds';
      const res = await editorFetch(url);
      if (id !== fetchIdRef.current) return; // stale, discard
      if (res.ok) {
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      } else {
        setImages([]);
        if (!preserveError) setError('Failed to load images');
      }
    } catch {
      if (id !== fetchIdRef.current) return;
      setImages([]);
      if (!preserveError) setError('Failed to load images');
    }
    if (id === fetchIdRef.current) setLoadingImages(false);
  }, []);

  useEffect(() => {
    fetchDirectories();
  }, [fetchDirectories]);

  useEffect(() => {
    fetchImages(selectedDir);
  }, [selectedDir, fetchImages]);

  useEffect(() => {
    if (showNewFolder) {
      newFolderInputRef.current?.focus();
    }
  }, [showNewFolder]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setError(null);
    const total = fileList.length;
    let hadError = false;
    let hadSuccess = false;

    for (let i = 0; i < total; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${total}...`);
      const formData = new FormData();
      formData.append('file', fileList[i]);
      if (selectedDir) formData.append('directory', selectedDir);

      try {
        const res = await editorFetch('/api/backgrounds', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Upload failed for ${fileList[i].name}`);
          hadError = true;
        } else {
          hadSuccess = true;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        hadError = true;
      }
    }

    setUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Refresh images and directories only if at least one upload succeeded
    if (hadSuccess) {
      fetchImages(selectedDir, hadError);  // preserve error if some uploads failed
      fetchDirectories();
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    // Extract filename from serve URL
    const url = new URL(imageUrl, 'http://localhost');
    const file = url.searchParams.get('file') || '';
    if (!file) return;

    // Extract directory and basename from the file path
    const parts = file.split('/');
    const basename = parts.pop() || '';
    const directory = parts.join('/');

    setDeletingImage(imageUrl);
    try {
      const res = await editorFetch('/api/backgrounds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: basename, directory: directory || undefined }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img !== imageUrl));
        if (selectedImage === imageUrl) setSelectedImage(null);
        fetchDirectories();
      }
    } catch {
      // ignore
    }
    setDeletingImage(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const res = await editorFetch('/api/backgrounds/directories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent: selectedDir || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewFolderName('');
        setShowNewFolder(false);
        fetchDirectories();
        setSelectedDir(data.path);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create folder');
      }
    } catch {
      setError('Failed to create folder');
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedDir) return;
    try {
      const res = await editorFetch('/api/backgrounds/directories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedDir }),
      });
      if (res.ok) {
        setSelectedDir('');
        fetchDirectories();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete folder');
      }
    } catch {
      setError('Failed to delete folder');
    }
  };

  const handleConfirm = () => {
    if (mode === 'pick-image' && selectedImage) {
      onSelectImage?.(selectedImage);
    } else if (mode === 'manage-directory') {
      onSelectDirectory?.(selectedDir);
    }
    onClose();
  };

  const currentDirInfo = directories.find((d) => d.path === selectedDir);

  // Build a tree structure for directories
  const rootDirs = directories.filter(
    (d) => d.path !== '' && !d.path.includes('/'),
  );
  const getSubDirs = (parentPath: string) =>
    directories.filter(
      (d) => d.path.startsWith(parentPath + '/') && !d.path.slice(parentPath.length + 1).includes('/'),
    );

  const isConfirmDisabled =
    mode === 'pick-image' ? !selectedImage : false;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-3xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-sm font-semibold text-neutral-100">
            Image Library
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — Directory Tree */}
          <div className="w-[180px] border-r border-neutral-700 flex flex-col">
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {loadingDirs ? (
                <p className="text-xs text-neutral-500 p-2">Loading...</p>
              ) : (
                <>
                  {/* Root (All Photos) */}
                  <DirectoryButton
                    name="All Photos"
                    imageCount={directories.find((d) => d.path === '')?.imageCount ?? 0}
                    selected={selectedDir === ''}
                    onClick={() => setSelectedDir('')}
                    depth={0}
                  />
                  {/* Top-level directories */}
                  {rootDirs.map((d) => (
                    <DirectoryTreeNode
                      key={d.path}
                      dir={d}
                      selectedDir={selectedDir}
                      onSelect={setSelectedDir}
                      getSubDirs={getSubDirs}
                      depth={1}
                    />
                  ))}
                </>
              )}
            </div>

            {/* New Folder */}
            <div className="p-2 border-t border-neutral-700">
              {showNewFolder ? (
                <div className="flex gap-1">
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setShowNewFolder(false);
                        setNewFolderName('');
                      }
                    }}
                    placeholder="Folder name"
                    className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200"
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="px-1.5 py-0.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="w-full text-xs text-neutral-400 hover:text-neutral-200 py-1"
                >
                  + New Folder
                </button>
              )}
            </div>
          </div>

          {/* Main area — Image Grid */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800">
              <span className="text-xs text-neutral-400 flex-1">
                {currentDirInfo?.name || 'All Photos'}
                {!loadingImages && (
                  <span className="text-neutral-500 ml-1">
                    ({images.length} {images.length === 1 ? 'photo' : 'photos'})
                  </span>
                )}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
              {selectedDir && images.length === 0 && !loadingImages && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDeleteFolder}
                >
                  Delete Folder
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? uploadProgress || 'Uploading...' : 'Upload Photos'}
              </Button>
            </div>

            {/* Image grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {loadingImages ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-neutral-500">Loading images...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <p className="text-xs text-neutral-500">No photos yet. Upload some!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <div key={img} className="relative group">
                      <button
                        onClick={() => {
                          if (mode === 'pick-image') {
                            setSelectedImage(selectedImage === img ? null : img);
                          }
                        }}
                        className={`aspect-square w-full rounded-md overflow-hidden border-2 transition-colors ${
                          selectedImage === img
                            ? 'border-blue-500'
                            : 'border-transparent hover:border-neutral-600'
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img);
                        }}
                        disabled={deletingImage === img}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-neutral-300 hover:bg-red-600 hover:text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Delete"
                      >
                        {deletingImage === img ? '...' : '\u00d7'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="px-3 pb-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-700">
          <Button size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {mode === 'pick-image' ? 'Select Image' : 'Use This Folder'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Directory tree helpers ──────────────────── */

function DirectoryButton({
  name,
  imageCount,
  selected,
  onClick,
  depth,
}: {
  name: string;
  imageCount: number;
  selected: boolean;
  onClick: () => void;
  depth: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-xs px-2 py-1 rounded transition-colors truncate ${
        selected
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-neutral-300 hover:bg-neutral-800'
      }`}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
      title={`${name} (${imageCount})`}
    >
      <span className="truncate">{name}</span>
      <span className="text-neutral-500 ml-1 text-[10px]">{imageCount}</span>
    </button>
  );
}

function DirectoryTreeNode({
  dir,
  selectedDir,
  onSelect,
  getSubDirs,
  depth,
}: {
  dir: DirectoryInfo;
  selectedDir: string;
  onSelect: (path: string) => void;
  getSubDirs: (parentPath: string) => DirectoryInfo[];
  depth: number;
}) {
  const subDirs = getSubDirs(dir.path);

  return (
    <>
      <DirectoryButton
        name={dir.name}
        imageCount={dir.imageCount}
        selected={selectedDir === dir.path}
        onClick={() => onSelect(dir.path)}
        depth={depth}
      />
      {subDirs.map((sub) => (
        <DirectoryTreeNode
          key={sub.path}
          dir={sub}
          selectedDir={selectedDir}
          onSelect={onSelect}
          getSubDirs={getSubDirs}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
