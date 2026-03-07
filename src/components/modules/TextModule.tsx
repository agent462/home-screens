'use client';

import type { TextConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface TextModuleProps {
  config: TextConfig;
  style: ModuleStyle;
}

export default function TextModule({ config, style }: TextModuleProps) {
  return (
    <ModuleWrapper style={style}>
      <div
        className="flex items-center h-full w-full"
        style={{ justifyContent: config.alignment === 'left' ? 'flex-start' : config.alignment === 'right' ? 'flex-end' : 'center' }}
      >
        <p style={{ textAlign: config.alignment }}>{config.content}</p>
      </div>
    </ModuleWrapper>
  );
}
