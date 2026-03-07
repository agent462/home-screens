'use client';

import type { ImageConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface ImageModuleProps {
  config: ImageConfig;
  style: ModuleStyle;
}

export default function ImageModule({ config, style }: ImageModuleProps) {
  return (
    <ModuleWrapper style={{ ...style, padding: 0 }}>
      {config.src ? (
        <img
          src={config.src}
          alt={config.alt}
          className="w-full h-full"
          style={{
            objectFit: config.objectFit,
            borderRadius: `${style.borderRadius}px`,
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-full opacity-40" style={{ fontSize: '0.875em' }}>
          No image set
        </div>
      )}
    </ModuleWrapper>
  );
}
