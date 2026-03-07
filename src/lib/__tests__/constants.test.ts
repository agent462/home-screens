import { describe, it, expect } from 'vitest';
import { snapToGrid, GRID_SIZE } from '../constants';

describe('snapToGrid', () => {
  it('snaps exact multiples to themselves', () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(GRID_SIZE)).toBe(GRID_SIZE);
    expect(snapToGrid(GRID_SIZE * 5)).toBe(GRID_SIZE * 5);
  });

  it('rounds to nearest grid line', () => {
    expect(snapToGrid(GRID_SIZE / 2 - 1)).toBe(0);
    expect(snapToGrid(GRID_SIZE / 2)).toBe(GRID_SIZE);
    expect(snapToGrid(GRID_SIZE + 1)).toBe(GRID_SIZE);
    expect(snapToGrid(GRID_SIZE * 2 - 1)).toBe(GRID_SIZE * 2);
  });

  it('handles negative values', () => {
    // Math.round has positive bias at midpoints: Math.round(-0.5) === 0
    expect(snapToGrid(-1)).toEqual(expect.closeTo(0, 0));
    expect(snapToGrid(-GRID_SIZE)).toBe(-GRID_SIZE);
    // -10/20 = -0.5, Math.round(-0.5) = 0, so this snaps to 0, not -GRID_SIZE
    expect(snapToGrid(-GRID_SIZE / 2)).toEqual(expect.closeTo(0, 0));
    // Past midpoint rounds down
    expect(snapToGrid(-GRID_SIZE / 2 - 1)).toBe(-GRID_SIZE);
  });
});
