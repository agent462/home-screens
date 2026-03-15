import { describe, it, expect } from 'vitest';
import { getTransitionConfig } from '../transitions';
import type { TransitionEffect } from '@/types/config';

describe('getTransitionConfig', () => {
  it('defaults to fade at 0.6s when called with no arguments', () => {
    const tc = getTransitionConfig();
    expect(tc.duration).toBe(0.6);
    expect(tc.easing).toBe('ease-in-out');
  });

  it('passes custom duration through', () => {
    const tc = getTransitionConfig('fade', 1.5);
    expect(tc.duration).toBe(1.5);
  });

  describe('none', () => {
    it('returns zero duration', () => {
      const tc = getTransitionConfig('none');
      expect(tc.duration).toBe(0);
    });

    it('ignores the duration parameter', () => {
      const tc = getTransitionConfig('none', 2.0);
      expect(tc.duration).toBe(0);
    });
  });

  it('all effects use ease-in-out easing', () => {
    const effects: TransitionEffect[] = ['fade', 'slide', 'slide-up', 'zoom', 'flip', 'blur', 'crossfade', 'none'];
    for (const effect of effects) {
      const tc = getTransitionConfig(effect);
      expect(tc.easing).toBe('ease-in-out');
    }
  });

  it('preserves custom duration for all non-none effects', () => {
    const effects: TransitionEffect[] = ['fade', 'slide', 'slide-up', 'zoom', 'flip', 'blur', 'crossfade'];
    for (const effect of effects) {
      const tc = getTransitionConfig(effect, 1.2);
      expect(tc.duration).toBe(1.2);
    }
  });
});
