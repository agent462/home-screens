'use client';

import type { StickyNoteConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface StickyNoteModuleProps {
  config: StickyNoteConfig;
  style: ModuleStyle;
}

export default function StickyNoteModule({ config, style }: StickyNoteModuleProps) {
  const noteColor = config.noteColor ?? '#fef08a';

  const overriddenStyle: ModuleStyle = {
    ...style,
    backgroundColor: noteColor,
    textColor: '#1a1a1a',
  };

  return (
    <ModuleWrapper style={overriddenStyle}>
      <div className="h-full w-full">
        <p style={{ whiteSpace: 'pre-wrap' }}>{config.content}</p>
      </div>
    </ModuleWrapper>
  );
}
