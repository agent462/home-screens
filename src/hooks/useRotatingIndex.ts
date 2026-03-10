'use client';
import { useState, useEffect } from 'react';

/**
 * Cycles through indices 0..itemCount-1 on a timer.
 * Returns 0 and does not start a timer when itemCount <= 1.
 */
export function useRotatingIndex(itemCount: number, intervalMs: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (itemCount <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % itemCount);
    }, intervalMs);
    return () => clearInterval(id);
  }, [itemCount, intervalMs]);

  return index;
}
