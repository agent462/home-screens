'use client';
import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Scales a font size based on the container's height using a ResizeObserver.
 * Returns a ref to attach to the container and the computed font size.
 */
export function useScaledFontSize(
  baseFontSize: number,
  scaleFactor: number,
): { containerRef: React.RefObject<HTMLDivElement | null>; scaledFontSize: number } {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaledFontSize, setScaledFontSize] = useState<number>(baseFontSize);

  const updateFontSize = useCallback(() => {
    if (containerRef.current) {
      const h = containerRef.current.clientHeight;
      setScaledFontSize(Math.max(baseFontSize, h * scaleFactor));
    }
  }, [baseFontSize, scaleFactor]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateFontSize);
    ro.observe(el);
    updateFontSize(); // measure immediately on mount
    return () => ro.disconnect();
  }, [updateFontSize]);

  return { containerRef, scaledFontSize };
}
