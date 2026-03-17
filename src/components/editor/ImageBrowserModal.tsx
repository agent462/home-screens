'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useImageLibrary, type DirectoryInfo } from '@/hooks/useImageLibrary';

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
  const lib = useImageLibrary({ initialDirectory });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConfirm = () => {
    if (mode === 'pick-image' && lib.selectedImage) {
      onSelectImage?.(lib.selectedImage);
    } else if (mode === 'manage-directory') {
      onSelectDirectory?.(lib.selectedDir);
    }
    onClose();
  };

  const currentDirInfo = lib.directories.find((d) => d.path === lib.selectedDir);

  // Build a tree structure for directories
  const rootDirs = lib.directories.filter(
    (d) => d.path !== '' && !d.path.includes('/'),
  );
  const getSubDirs = (parentPath: string) =>
    lib.directories.filter(
      (d) => d.path.startsWith(parentPath + '/') && !d.path.slice(parentPath.length + 1).includes('/'),
    );

  const isConfirmDisabled =
    mode === 'pick-image' ? !lib.selectedImage : false;

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
          <DirectorySidebar
            directories={lib.directories}
            rootDirs={rootDirs}
            selectedDir={lib.selectedDir}
            onSelectDir={lib.setSelectedDir}
            getSubDirs={getSubDirs}
            loadingDirs={lib.loadingDirs}
            showNewFolder={lib.showNewFolder}
            setShowNewFolder={lib.setShowNewFolder}
            newFolderName={lib.newFolderName}
            setNewFolderName={lib.setNewFolderName}
            onCreateFolder={lib.handleCreateFolder}
            newFolderInputRef={lib.newFolderInputRef}
          />

          {/* Main area — Image Grid */}
          <ImageGrid
            images={lib.images}
            selectedImage={lib.selectedImage}
            onSelectImage={(img) => {
              if (mode === 'pick-image') {
                lib.setSelectedImage(lib.selectedImage === img ? null : img);
              }
            }}
            loadingImages={lib.loadingImages}
            deletingImage={lib.deletingImage}
            onDeleteImage={lib.handleDeleteImage}
            currentDirName={currentDirInfo?.name || 'All Photos'}
            selectedDir={lib.selectedDir}
            uploading={lib.uploading}
            uploadProgress={lib.uploadProgress}
            onUpload={lib.handleUpload}
            onDeleteFolder={lib.handleDeleteFolder}
            fileInputRef={lib.fileInputRef}
            error={lib.error}
          />
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

/* ─── Directory Sidebar ──────────────────── */

function DirectorySidebar({
  directories,
  rootDirs,
  selectedDir,
  onSelectDir,
  getSubDirs,
  loadingDirs,
  showNewFolder,
  setShowNewFolder,
  newFolderName,
  setNewFolderName,
  onCreateFolder,
  newFolderInputRef,
}: {
  directories: DirectoryInfo[];
  rootDirs: DirectoryInfo[];
  selectedDir: string;
  onSelectDir: (path: string) => void;
  getSubDirs: (parentPath: string) => DirectoryInfo[];
  loadingDirs: boolean;
  showNewFolder: boolean;
  setShowNewFolder: (show: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: () => void;
  newFolderInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
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
              onClick={() => onSelectDir('')}
              depth={0}
            />
            {/* Top-level directories */}
            {rootDirs.map((d) => (
              <DirectoryTreeNode
                key={d.path}
                dir={d}
                selectedDir={selectedDir}
                onSelect={onSelectDir}
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
                if (e.key === 'Enter') onCreateFolder();
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
              onClick={onCreateFolder}
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
  );
}

/* ─── Image Grid ──────────────────── */

function ImageGrid({
  images,
  selectedImage,
  onSelectImage,
  loadingImages,
  deletingImage,
  onDeleteImage,
  currentDirName,
  selectedDir,
  uploading,
  uploadProgress,
  onUpload,
  onDeleteFolder,
  fileInputRef,
  error,
}: {
  images: string[];
  selectedImage: string | null;
  onSelectImage: (img: string) => void;
  loadingImages: boolean;
  deletingImage: string | null;
  onDeleteImage: (imageUrl: string) => void;
  currentDirName: string;
  selectedDir: string;
  uploading: boolean;
  uploadProgress: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteFolder: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800">
        <span className="text-xs text-neutral-400 flex-1">
          {currentDirName}
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
          onChange={onUpload}
          className="hidden"
        />
        {selectedDir && images.length === 0 && !loadingImages && (
          <Button
            size="sm"
            variant="danger"
            onClick={onDeleteFolder}
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
                  onClick={() => onSelectImage(img)}
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
                    onDeleteImage(img);
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
