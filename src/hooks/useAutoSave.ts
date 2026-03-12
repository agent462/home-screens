'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';

const AUTO_SAVE_DELAY = 800;

export function useAutoSave() {
  const config = useEditorStore((s) => s.config);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const saveConfig = useEditorStore((s) => s.saveConfig);
  const saveError = useEditorStore((s) => s.saveError);

  // Auto-save: debounce 800ms after last change
  useEffect(() => {
    if (!isDirty || isSaving) return;
    const timer = setTimeout(() => saveConfig().catch(() => {}), AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [config, isDirty, isSaving, saveConfig]);

  // Prevent navigating away with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { isDirty, isSaving, saveError, saveConfig };
}
