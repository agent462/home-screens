import type { ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

export function ModuleLoadingState({ style, message }: { style: ModuleStyle; message: string }) {
  return (
    <ModuleWrapper style={style}>
      <div className="flex items-center justify-center h-full">
        <p className="text-center opacity-50">{message}</p>
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
