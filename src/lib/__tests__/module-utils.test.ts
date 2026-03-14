import { describe, it, expect } from 'vitest';
import { countOffCanvasModules, totalModuleCount, scaleModulesToFit } from '@/lib/module-utils';
import type { Screen } from '@/types/config';
import { DEFAULT_MODULE_STYLE } from '@/types/config';

function makeScreen(modules: { x: number; y: number; w: number; h: number }[]): Screen {
  return {
    id: 'test',
    name: 'Test',
    backgroundImage: '',
    modules: modules.map((m, i) => ({
      id: `mod-${i}`,
      type: 'text' as const,
      position: { x: m.x, y: m.y },
      size: { w: m.w, h: m.h },
      zIndex: 1,
      config: {},
      style: { ...DEFAULT_MODULE_STYLE },
    })),
  };
}

// ── countOffCanvasModules ────────────────────────────────────────────

describe('countOffCanvasModules', () => {
  it('returns 0 when there are no modules', () => {
    expect(countOffCanvasModules([makeScreen([])], 1920, 1080)).toBe(0);
  });

  it('returns 0 when all modules fit', () => {
    const screen = makeScreen([
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 500, y: 400, w: 200, h: 200 },
    ]);
    expect(countOffCanvasModules([screen], 1920, 1080)).toBe(0);
  });

  it('counts modules that exceed width', () => {
    const screen = makeScreen([
      { x: 1000, y: 0, w: 200, h: 100 }, // right edge = 1200 > 1080
      { x: 0, y: 0, w: 100, h: 100 },     // fits
    ]);
    expect(countOffCanvasModules([screen], 1080, 1920)).toBe(1);
  });

  it('counts modules that exceed height', () => {
    const screen = makeScreen([
      { x: 0, y: 1800, w: 100, h: 300 }, // bottom = 2100 > 1080
    ]);
    expect(countOffCanvasModules([screen], 1920, 1080)).toBe(1);
  });

  it('counts across multiple screens', () => {
    const s1 = makeScreen([{ x: 1800, y: 0, w: 200, h: 100 }]); // right=2000
    const s2 = makeScreen([{ x: 0, y: 0, w: 100, h: 100 }]);     // fits always
    const s3 = makeScreen([{ x: 0, y: 1000, w: 100, h: 200 }]);  // bottom=1200
    // 1920×1080: s1 right=2000>1920 off, s3 bottom=1200>1080 off
    expect(countOffCanvasModules([s1, s2, s3], 1920, 1080)).toBe(2);
    // 1080×1080: s1 right=2000>1080 off, s3 bottom=1200>1080 off
    expect(countOffCanvasModules([s1, s2, s3], 1080, 1080)).toBe(2);
    // 2000×1200: all fit
    expect(countOffCanvasModules([s1, s2, s3], 2000, 1200)).toBe(0);
  });

  it('treats module exactly at edge as fitting', () => {
    const screen = makeScreen([{ x: 0, y: 0, w: 1080, h: 1920 }]);
    expect(countOffCanvasModules([screen], 1080, 1920)).toBe(0);
  });

  it('returns 0 for empty screens array', () => {
    expect(countOffCanvasModules([], 1920, 1080)).toBe(0);
  });
});

// ── totalModuleCount ─────────────────────────────────────────────────

describe('totalModuleCount', () => {
  it('counts modules across screens', () => {
    const s1 = makeScreen([{ x: 0, y: 0, w: 100, h: 100 }]);
    const s2 = makeScreen([
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 100, y: 0, w: 100, h: 100 },
    ]);
    expect(totalModuleCount([s1, s2])).toBe(3);
  });

  it('returns 0 for empty screens', () => {
    expect(totalModuleCount([makeScreen([])])).toBe(0);
  });

  it('returns 0 for empty screens array', () => {
    expect(totalModuleCount([])).toBe(0);
  });
});

// ── scaleModulesToFit ────────────────────────────────────────────────

describe('scaleModulesToFit', () => {
  it('scales positions and sizes uniformly', () => {
    // Portrait 1080x1920 → Landscape 1920x1080
    // scale = min(1920/1080, 1080/1920) = min(1.78, 0.5625) = 0.5625
    const screen = makeScreen([{ x: 0, y: 0, w: 1080, h: 1920 }]);
    const result = scaleModulesToFit([screen], 1080, 1920, 1920, 1080);
    const mod = result[0].modules[0];
    // 1080 * 0.5625 = 607.5 → snapped to 600; 1920 * 0.5625 = 1080 → 1080
    expect(mod.size.w).toBe(600);
    expect(mod.size.h).toBe(1080);
    expect(mod.position.x).toBe(0);
    expect(mod.position.y).toBe(0);
  });

  it('snaps results to grid (multiples of 20)', () => {
    const screen = makeScreen([{ x: 100, y: 300, w: 500, h: 400 }]);
    const result = scaleModulesToFit([screen], 1080, 1920, 1920, 1080);
    const mod = result[0].modules[0];
    expect(mod.position.x % 20).toBe(0);
    expect(mod.position.y % 20).toBe(0);
    expect(mod.size.w % 20).toBe(0);
    expect(mod.size.h % 20).toBe(0);
  });

  it('clamps modules to stay on canvas', () => {
    // Module near the bottom — after scaling position, ensure it stays on-canvas
    const screen = makeScreen([{ x: 900, y: 1700, w: 100, h: 100 }]);
    const result = scaleModulesToFit([screen], 1080, 1920, 1920, 1080);
    const mod = result[0].modules[0];
    expect(mod.position.x + mod.size.w).toBeLessThanOrEqual(1920);
    expect(mod.position.y + mod.size.h).toBeLessThanOrEqual(1080);
  });

  it('enforces minimum size of 60px', () => {
    const screen = makeScreen([{ x: 0, y: 0, w: 60, h: 60 }]);
    // Scale factor will try to make these smaller
    const result = scaleModulesToFit([screen], 1920, 1080, 320, 180);
    const mod = result[0].modules[0];
    expect(mod.size.w).toBeGreaterThanOrEqual(60);
    expect(mod.size.h).toBeGreaterThanOrEqual(60);
  });

  it('preserves screen metadata (id, name, etc.)', () => {
    const screen = makeScreen([{ x: 0, y: 0, w: 200, h: 200 }]);
    screen.name = 'My Screen';
    screen.backgroundImage = '/bg.jpg';
    const result = scaleModulesToFit([screen], 1080, 1920, 1920, 1080);
    expect(result[0].name).toBe('My Screen');
    expect(result[0].backgroundImage).toBe('/bg.jpg');
  });

  it('handles empty screens without error', () => {
    const screen = makeScreen([]);
    const result = scaleModulesToFit([screen], 1080, 1920, 1920, 1080);
    expect(result[0].modules).toHaveLength(0);
  });

  it('identity scale (same dimensions) preserves positions', () => {
    const screen = makeScreen([{ x: 100, y: 200, w: 400, h: 300 }]);
    const result = scaleModulesToFit([screen], 1080, 1920, 1080, 1920);
    const mod = result[0].modules[0];
    expect(mod.position).toEqual({ x: 100, y: 200 });
    expect(mod.size).toEqual({ w: 400, h: 300 });
  });

  it('scales up to a larger canvas', () => {
    // 1080x1920 → 2160x3840, scale = min(2, 2) = 2
    const screen = makeScreen([{ x: 100, y: 200, w: 400, h: 300 }]);
    const result = scaleModulesToFit([screen], 1080, 1920, 2160, 3840);
    const mod = result[0].modules[0];
    expect(mod.position).toEqual({ x: 200, y: 400 });
    expect(mod.size).toEqual({ w: 800, h: 600 });
  });

  it('scales multiple modules on the same screen independently', () => {
    const screen = makeScreen([
      { x: 0, y: 0, w: 1040, h: 200 },
      { x: 0, y: 1600, w: 1040, h: 300 },
    ]);
    // Portrait 1080x1920 → Landscape 1920x1080, scale = 0.5625
    const result = scaleModulesToFit([screen], 1080, 1920, 1920, 1080);
    expect(result[0].modules).toHaveLength(2);
    for (const mod of result[0].modules) {
      expect(mod.position.x + mod.size.w).toBeLessThanOrEqual(1920);
      expect(mod.position.y + mod.size.h).toBeLessThanOrEqual(1080);
    }
  });

  it('clamps module at canvas boundary after scale-down', () => {
    // Module touching right and bottom edges
    const screen = makeScreen([{ x: 980, y: 1820, w: 100, h: 100 }]);
    const result = scaleModulesToFit([screen], 1080, 1920, 1920, 1080);
    const mod = result[0].modules[0];
    expect(mod.position.x + mod.size.w).toBeLessThanOrEqual(1920);
    expect(mod.position.y + mod.size.h).toBeLessThanOrEqual(1080);
  });
});
