import type { TransitionEffect } from '@/types/config';
import type { Transition, TargetAndTransition } from 'framer-motion';

interface TransitionVariants {
  initial: TargetAndTransition | false;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
  mode: 'wait' | 'sync';
}

export function getTransitionVariants(
  effect: TransitionEffect = 'fade',
  duration: number = 0.6,
): TransitionVariants {
  const base: Transition = { duration, ease: 'easeInOut' };

  switch (effect) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.02 },
        transition: base,
        mode: 'wait',
      };

    case 'slide':
      return {
        initial: { x: '100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
        transition: base,
        mode: 'wait',
      };

    case 'slide-up':
      return {
        initial: { y: '100%', opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: '-100%', opacity: 0 },
        transition: base,
        mode: 'wait',
      };

    case 'zoom':
      return {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 1.2, opacity: 0 },
        transition: base,
        mode: 'wait',
      };

    case 'flip':
      return {
        initial: { rotateY: 90, opacity: 0 },
        animate: { rotateY: 0, opacity: 1 },
        exit: { rotateY: -90, opacity: 0 },
        transition: base,
        mode: 'wait',
      };

    case 'blur':
      return {
        initial: { opacity: 0, filter: 'blur(20px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(20px)' },
        transition: base,
        mode: 'wait',
      };

    case 'crossfade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: base,
        mode: 'sync',
      };

    case 'none':
      return {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
        mode: 'wait',
      };
  }
}
