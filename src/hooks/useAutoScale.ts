'use client';

import { useRef, useEffect, useCallback } from 'react';

/**
 * Scales content to fill its container using CSS transform.
 * containerRef: the bounding box to fill
 * contentRef: the content to scale (should use inline-flex or similar to shrink-wrap)
 */
export function useAutoScale<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  const contentRef = useRef<T>(null);

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Reset transform to measure natural size
    content.style.transform = 'scale(1)';

    requestAnimationFrame(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const sw = content.scrollWidth;
      const sh = content.scrollHeight;

      if (sw === 0 || sh === 0 || cw === 0 || ch === 0) return;

      const scale = Math.min(cw / sw, ch / sh);
      content.style.transform = `scale(${scale})`;
      content.style.transformOrigin = 'top left';
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    recalculate();

    return () => observer.disconnect();
  }, [recalculate]);

  return { containerRef, contentRef, recalculate };
}
