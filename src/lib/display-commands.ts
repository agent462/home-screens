/**
 * In-memory command queue and status store for display remote control.
 *
 * Commands are enqueued by external API calls (phone, Home Assistant, scripts)
 * and drained by the display client on its 3s poll cycle.
 *
 * Status is reported by the display client so external tools can query
 * what the display is currently showing.
 */

export type DisplayCommandType =
  | 'wake'
  | 'sleep'
  | 'next-screen'
  | 'prev-screen'
  | 'brightness'
  | 'reload'
  | 'alert';

export interface DisplayCommand {
  type: DisplayCommandType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface DisplayStatus {
  currentScreen: {
    index: number;
    id: string;
    name: string;
  };
  screenCount: number;
  activeProfile: string | null;
  displayState: 'active' | 'dimmed' | 'asleep';
  timestamp: number;
}

const commandQueue: DisplayCommand[] = [];
let lastStatus: DisplayStatus | null = null;

export function enqueueCommand(type: DisplayCommandType, payload?: Record<string, unknown>): void {
  commandQueue.push({ type, payload, timestamp: Date.now() });
}

/** Drain and return all pending commands (clears the queue). */
export function drainCommands(): DisplayCommand[] {
  return commandQueue.splice(0);
}

export function setDisplayStatus(status: DisplayStatus): void {
  lastStatus = status;
}

export function getDisplayStatus(): DisplayStatus | null {
  return lastStatus;
}
