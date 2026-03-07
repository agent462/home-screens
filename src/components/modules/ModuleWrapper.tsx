'use client';

import type { ModuleStyle } from '@/types/config';
import type { ReactNode } from 'react';

interface ModuleWrapperProps {
  style: ModuleStyle;
  children: ReactNode;
}

export default function ModuleWrapper({ style, children }: ModuleWrapperProps) {
  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{
        opacity: style.opacity,
        borderRadius: `${style.borderRadius}px`,
        padding: `${style.padding}px`,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        backdropFilter: `blur(${style.backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${style.backdropBlur}px)`,
      }}
    >
      {children}
    </div>
  );
}
