import type { ClockConfig } from '@/types/config';
import type { RefObject } from 'react';

export interface ClockViewProps {
  config: ClockConfig;
  now: Date;
  scaledFontSize: number;
  containerRef: RefObject<HTMLDivElement | null>;
  timezone?: string;
}
