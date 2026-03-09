import type { ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

export function LocationRequired({ style }: { style: ModuleStyle }) {
  return (
    <ModuleWrapper style={style}>
      <div className="flex items-center justify-center h-full opacity-50" style={{ fontSize: '0.85em' }}>
        Location not configured
      </div>
    </ModuleWrapper>
  );
}
