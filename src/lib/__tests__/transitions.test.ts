import { describe, it, expect } from 'vitest';
import { getTransitionVariants } from '../transitions';
import type { TransitionEffect } from '@/types/config';

describe('getTransitionVariants', () => {
  it('defaults to fade at 0.6s when called with no arguments', () => {
    const tv = getTransitionVariants();
    expect(tv.mode).toBe('wait');
    expect(tv.transition).toEqual({ duration: 0.6, ease: 'easeInOut' });
    expect(tv.initial).toEqual({ opacity: 0 });
  });

  it('passes custom duration through to the transition object', () => {
    const tv = getTransitionVariants('fade', 1.5);
    expect(tv.transition).toEqual({ duration: 1.5, ease: 'easeInOut' });
  });

  describe('fade', () => {
    it('fades opacity with subtle scale on exit', () => {
      const tv = getTransitionVariants('fade');
      expect(tv.initial).toEqual({ opacity: 0 });
      expect(tv.animate).toEqual({ opacity: 1, scale: 1 });
      expect(tv.exit).toEqual({ opacity: 0, scale: 1.02 });
      expect(tv.mode).toBe('wait');
    });
  });

  describe('slide', () => {
    it('translates horizontally', () => {
      const tv = getTransitionVariants('slide');
      expect(tv.initial).toEqual({ x: '100%', opacity: 0 });
      expect(tv.animate).toEqual({ x: 0, opacity: 1 });
      expect(tv.exit).toEqual({ x: '-100%', opacity: 0 });
      expect(tv.mode).toBe('wait');
    });
  });

  describe('slide-up', () => {
    it('translates vertically', () => {
      const tv = getTransitionVariants('slide-up');
      expect(tv.initial).toEqual({ y: '100%', opacity: 0 });
      expect(tv.animate).toEqual({ y: 0, opacity: 1 });
      expect(tv.exit).toEqual({ y: '-100%', opacity: 0 });
      expect(tv.mode).toBe('wait');
    });
  });

  describe('zoom', () => {
    it('scales in and out with opacity', () => {
      const tv = getTransitionVariants('zoom');
      expect(tv.initial).toEqual({ scale: 0.8, opacity: 0 });
      expect(tv.animate).toEqual({ scale: 1, opacity: 1 });
      expect(tv.exit).toEqual({ scale: 1.2, opacity: 0 });
      expect(tv.mode).toBe('wait');
    });
  });

  describe('flip', () => {
    it('rotates on Y axis', () => {
      const tv = getTransitionVariants('flip');
      expect(tv.initial).toEqual({ rotateY: 90, opacity: 0 });
      expect(tv.animate).toEqual({ rotateY: 0, opacity: 1 });
      expect(tv.exit).toEqual({ rotateY: -90, opacity: 0 });
      expect(tv.mode).toBe('wait');
    });
  });

  describe('blur', () => {
    it('applies gaussian blur with opacity', () => {
      const tv = getTransitionVariants('blur');
      expect(tv.initial).toEqual({ opacity: 0, filter: 'blur(20px)' });
      expect(tv.animate).toEqual({ opacity: 1, filter: 'blur(0px)' });
      expect(tv.exit).toEqual({ opacity: 0, filter: 'blur(20px)' });
      expect(tv.mode).toBe('wait');
    });
  });

  describe('crossfade', () => {
    it('uses sync mode for overlapping screens', () => {
      const tv = getTransitionVariants('crossfade');
      expect(tv.mode).toBe('sync');
      expect(tv.initial).toEqual({ opacity: 0 });
      expect(tv.animate).toEqual({ opacity: 1 });
      expect(tv.exit).toEqual({ opacity: 0 });
    });
  });

  describe('none', () => {
    it('uses zero duration and skips initial animation', () => {
      const tv = getTransitionVariants('none');
      expect(tv.initial).toBe(false);
      expect(tv.transition).toEqual({ duration: 0 });
      expect(tv.mode).toBe('wait');
    });

    it('ignores the duration parameter', () => {
      const tv = getTransitionVariants('none', 2.0);
      expect(tv.transition).toEqual({ duration: 0 });
    });
  });

  it('all wait-mode effects use easeInOut easing', () => {
    const waitEffects: TransitionEffect[] = ['fade', 'slide', 'slide-up', 'zoom', 'flip', 'blur', 'crossfade'];
    for (const effect of waitEffects) {
      const tv = getTransitionVariants(effect, 0.8);
      expect(tv.transition).toEqual({ duration: 0.8, ease: 'easeInOut' });
    }
  });

  it('crossfade is the only effect that uses sync mode', () => {
    const allEffects: TransitionEffect[] = ['fade', 'slide', 'slide-up', 'zoom', 'flip', 'blur', 'crossfade', 'none'];
    for (const effect of allEffects) {
      const tv = getTransitionVariants(effect);
      if (effect === 'crossfade') {
        expect(tv.mode).toBe('sync');
      } else {
        expect(tv.mode).toBe('wait');
      }
    }
  });
});
