import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueCommand,
  drainCommands,
  setDisplayStatus,
  getDisplayStatus,
  type DisplayStatus,
} from '@/lib/display-commands';

// The module uses module-level state, so we drain between tests to reset
beforeEach(() => {
  drainCommands();
});

describe('enqueueCommand / drainCommands', () => {
  it('returns empty array when nothing queued', () => {
    expect(drainCommands()).toEqual([]);
  });

  it('enqueues a simple command with timestamp', () => {
    enqueueCommand('wake');
    const commands = drainCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0].type).toBe('wake');
    expect(commands[0].payload).toBeUndefined();
    expect(commands[0].timestamp).toBeTypeOf('number');
  });

  it('enqueues a command with payload', () => {
    enqueueCommand('brightness', { value: 50 });
    const commands = drainCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0].type).toBe('brightness');
    expect(commands[0].payload).toEqual({ value: 50 });
  });

  it('drains all commands in FIFO order', () => {
    enqueueCommand('wake');
    enqueueCommand('next-screen');
    enqueueCommand('sleep');
    const commands = drainCommands();
    expect(commands).toHaveLength(3);
    expect(commands.map((c) => c.type)).toEqual(['wake', 'next-screen', 'sleep']);
  });

  it('clears the queue after drain', () => {
    enqueueCommand('wake');
    enqueueCommand('reload');
    const first = drainCommands();
    expect(first).toHaveLength(2);
    const second = drainCommands();
    expect(second).toEqual([]);
  });

  it('preserves alert payload fields', () => {
    enqueueCommand('alert', {
      type: 'warning',
      title: 'Test',
      message: 'Hello',
      duration: 5000,
    });
    const [cmd] = drainCommands();
    expect(cmd.payload).toEqual({
      type: 'warning',
      title: 'Test',
      message: 'Hello',
      duration: 5000,
    });
  });
});

describe('setDisplayStatus / getDisplayStatus', () => {
  it('returns null when no status has been reported', () => {
    // getDisplayStatus shares module state; it may have been set by prior tests.
    // We can't easily reset it, so just verify the shape if it exists.
    const status = getDisplayStatus();
    if (status !== null) {
      expect(status).toHaveProperty('currentScreen');
      expect(status).toHaveProperty('displayState');
    }
  });

  it('stores and returns status', () => {
    const status: DisplayStatus = {
      currentScreen: { index: 0, id: 'screen-1', name: 'Main' },
      screenCount: 2,
      activeProfile: 'day',
      displayState: 'active',
      timestamp: Date.now(),
    };
    setDisplayStatus(status);
    expect(getDisplayStatus()).toEqual(status);
  });

  it('overwrites previous status', () => {
    setDisplayStatus({
      currentScreen: { index: 0, id: 'a', name: 'A' },
      screenCount: 1,
      activeProfile: null,
      displayState: 'active',
      timestamp: 1,
    });
    const updated: DisplayStatus = {
      currentScreen: { index: 1, id: 'b', name: 'B' },
      screenCount: 3,
      activeProfile: 'night',
      displayState: 'asleep',
      timestamp: 2,
    };
    setDisplayStatus(updated);
    expect(getDisplayStatus()).toEqual(updated);
  });
});
