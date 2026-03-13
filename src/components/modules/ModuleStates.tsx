import type { ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

export function ModuleLoadingState({ style, message, error }: { style: ModuleStyle; message: string; error?: string | null }) {
  return (
    <ModuleWrapper style={style}>
      <div className="flex items-center justify-center h-full px-4">
        {error ? (
          <p className="text-center text-sm text-red-400/80">{error}</p>
        ) : (
          <p className="text-center opacity-50">{message}</p>
        )}
      </div>
    </ModuleWrapper>
  );
}

export function ModuleEmptyState({ style, message }: { style: ModuleStyle; message: string }) {
  return (
    <ModuleWrapper style={style}>
      <div className="flex items-center justify-center h-full">
        <p className="text-center opacity-50">{message}</p>
      </div>
    </ModuleWrapper>
  );
}
