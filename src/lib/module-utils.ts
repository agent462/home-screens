import type { Screen } from '@/types/config';
import { GRID_SIZE, snapToGrid } from '@/lib/constants';

const MIN_SIZE = 60;

/**
 * Count how many modules across all screens would extend beyond the given
 * canvas dimensions.  A module is "off-canvas" if any part of it exceeds
 * the new width or height.
 */
export function countOffCanvasModules(
  screens: Screen[],
  newWidth: number,
  newHeight: number,
): number {
  let count = 0;
  for (const screen of screens) {
    for (const mod of screen.modules) {
      if (
        mod.position.x + mod.size.w > newWidth ||
        mod.position.y + mod.size.h > newHeight
      ) {
        count++;
      }
    }
  }
  return count;
}

/** Total module count across all screens. */
export function totalModuleCount(screens: Screen[]): number {
  return screens.reduce((sum, s) => sum + s.modules.length, 0);
}

/**
 * Uniformly scale every module's position and size so the entire layout
 * fits within `newWidth × newHeight`.  Uses `min(scaleX, scaleY)` so
 * relative proportions are preserved.  Results are snapped to the grid
 * and clamped to stay fully on-canvas.
 */
export function scaleModulesToFit(
  screens: Screen[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): Screen[] {
  const scale = Math.min(newWidth / oldWidth, newHeight / oldHeight);

  return screens.map((screen) => ({
    ...screen,
    modules: screen.modules.map((m) => {
      let w = snapToGrid(Math.max(MIN_SIZE, Math.round(m.size.w * scale)));
      let h = snapToGrid(Math.max(MIN_SIZE, Math.round(m.size.h * scale)));
      let x = snapToGrid(Math.round(m.position.x * scale));
      let y = snapToGrid(Math.round(m.position.y * scale));

      // Clamp size to display bounds (at least one grid cell)
      w = Math.min(w, newWidth);
      h = Math.min(h, newHeight);

      // Ensure w and h are at least MIN_SIZE after clamping, snapped to grid
      if (w < MIN_SIZE) w = Math.min(Math.ceil(MIN_SIZE / GRID_SIZE) * GRID_SIZE, newWidth);
      if (h < MIN_SIZE) h = Math.min(Math.ceil(MIN_SIZE / GRID_SIZE) * GRID_SIZE, newHeight);

      // Clamp position so module stays fully on-canvas
      x = Math.max(0, Math.min(x, newWidth - w));
      y = Math.max(0, Math.min(y, newHeight - h));

      return { ...m, position: { x, y }, size: { w, h } };
    }),
  }));
}
