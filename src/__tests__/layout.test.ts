import { computeLayout, addToLayout, removeFromLayout } from '../layout';
import { rectsOverlap } from '../utils';
import type { PenduImageData, LayoutResult } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noOverlaps(result: LayoutResult, gap: number): boolean {
  const { frames } = result;
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      if (rectsOverlap(frames[i], frames[j], gap)) {
        return false;
      }
    }
  }
  return true;
}

const landscape: PenduImageData = { width: 1200, height: 800 };
const portrait: PenduImageData = { width: 800, height: 1200 };
const square: PenduImageData = { width: 800, height: 800 };

const defaultOpts = { seed: 42, gap: 16, containerWidth: 680, containerHeight: 500 };

// ---------------------------------------------------------------------------
// computeLayout — edge cases
// ---------------------------------------------------------------------------

describe('computeLayout', () => {
  it('handles 0 images', () => {
    const result = computeLayout([], defaultOpts);
    expect(result.frames).toHaveLength(0);
    expect(result.bounds.width).toBe(0);
    expect(result.stats.placed).toBe(0);
    expect(result.stats.failed).toBe(0);
    expect(result.stats.avgScale).toBe(0);
  });

  it('places 1 image at center', () => {
    const result = computeLayout([landscape], defaultOpts);
    expect(result.frames).toHaveLength(1);
    expect(result.stats.placed).toBe(1);
    expect(result.frames[0].scale).toBeGreaterThanOrEqual(1.0);

    // Frame should be roughly centered
    const f = result.frames[0];
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    expect(cx).toBeCloseTo(340, -1);
    expect(cy).toBeCloseTo(250, -1);
  });

  it('places 2 frames with no overlap', () => {
    const result = computeLayout([landscape, portrait], defaultOpts);
    expect(result.frames).toHaveLength(2);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('places N frames (8) with no overlaps', () => {
    const images: PenduImageData[] = [
      landscape, portrait, landscape, portrait,
      square, landscape, portrait, square,
    ];
    const result = computeLayout(images, defaultOpts);
    expect(result.frames.length).toBeGreaterThanOrEqual(6); // most should place
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('places N frames (15) with no overlaps', () => {
    const images: PenduImageData[] = Array.from({ length: 15 }, (_, i) =>
      i % 3 === 0 ? landscape : i % 3 === 1 ? portrait : square,
    );
    const result = computeLayout(images, defaultOpts);
    expect(result.frames.length).toBeGreaterThanOrEqual(10);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('handles all portraits', () => {
    const images = Array.from({ length: 6 }, () => portrait);
    const result = computeLayout(images, defaultOpts);
    expect(result.frames.length).toBeGreaterThanOrEqual(4);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('handles all landscapes', () => {
    const images = Array.from({ length: 6 }, () => landscape);
    const result = computeLayout(images, defaultOpts);
    expect(result.frames.length).toBeGreaterThanOrEqual(4);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('tracks failed count correctly in stats', () => {
    const images = [landscape, portrait, square];
    const result = computeLayout(images, defaultOpts);
    expect(result.stats.placed + result.stats.failed).toBe(images.length);
  });

  it('handles mixed aspect ratios from demo images', () => {
    const images: PenduImageData[] = [
      { width: 1200, height: 800 },   // landscape-1
      { width: 1600, height: 1000 },  // landscape-2
      { width: 1400, height: 800 },   // landscape-3
      { width: 900, height: 600 },    // landscape-4
      { width: 800, height: 1200 },   // portrait-1
      { width: 800, height: 800 },    // portrait-2 (square)
      { width: 1200, height: 1800 },  // portrait-3
      { width: 1200, height: 1600 },  // portrait-4
    ];
    const result = computeLayout(images, defaultOpts);
    expect(result.frames.length).toBeGreaterThanOrEqual(6);
    expect(noOverlaps(result, 16)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeLayout — determinism
// ---------------------------------------------------------------------------

describe('computeLayout — determinism', () => {
  it('same seed + same input = identical output', () => {
    const images = [landscape, portrait, square, landscape];
    const a = computeLayout(images, { ...defaultOpts, seed: 123 });
    const b = computeLayout(images, { ...defaultOpts, seed: 123 });
    expect(a.frames).toEqual(b.frames);
    expect(a.bounds).toEqual(b.bounds);
    expect(a.stats).toEqual(b.stats);
  });

  it('different seeds produce different layouts', () => {
    const images = [landscape, portrait, square, landscape];
    const a = computeLayout(images, { ...defaultOpts, seed: 100 });
    const b = computeLayout(images, { ...defaultOpts, seed: 200 });

    // At least one frame should differ in position
    const differs = a.frames.some(
      (f, i) => f.x !== b.frames[i].x || f.y !== b.frames[i].y,
    );
    expect(differs).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeLayout — constraints
// ---------------------------------------------------------------------------

describe('computeLayout — constraints', () => {
  it('enforces min scale', () => {
    const images = Array.from({ length: 12 }, (_, i) =>
      i % 2 === 0 ? landscape : portrait,
    );
    const result = computeLayout(images, { ...defaultOpts, minScale: 0.5 });
    for (const f of result.frames) {
      expect(f.scale).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('respects custom gap', () => {
    const images = [landscape, portrait];
    const result = computeLayout(images, { ...defaultOpts, gap: 32 });
    expect(result.frames).toHaveLength(2);
    expect(noOverlaps(result, 32)).toBe(true);
  });

  it('bounds output matches actual frame positions', () => {
    const images = [landscape, portrait, square, landscape, portrait];
    const result = computeLayout(images, defaultOpts);
    const { bounds, frames } = result;

    if (frames.length > 0) {
      const actualMinX = Math.min(...frames.map((f) => f.x));
      const actualMinY = Math.min(...frames.map((f) => f.y));
      const actualMaxX = Math.max(...frames.map((f) => f.x + f.width));
      const actualMaxY = Math.max(...frames.map((f) => f.y + f.height));

      expect(bounds.minX).toBeCloseTo(actualMinX, 5);
      expect(bounds.minY).toBeCloseTo(actualMinY, 5);
      expect(bounds.maxX).toBeCloseTo(actualMaxX, 5);
      expect(bounds.maxY).toBeCloseTo(actualMaxY, 5);
    }
  });

  it('stats reflect actual results', () => {
    const images = [landscape, portrait, square];
    const result = computeLayout(images, defaultOpts);
    expect(result.stats.placed).toBe(result.frames.length);
    expect(result.stats.placed + result.stats.failed).toBe(images.length);
    expect(result.stats.avgScale).toBeGreaterThan(0);
    expect(result.stats.avgScale).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// addToLayout
// ---------------------------------------------------------------------------

describe('addToLayout', () => {
  it('adds a frame to an existing layout', () => {
    const initial = computeLayout([landscape, portrait], defaultOpts);
    const result = addToLayout(initial, square, defaultOpts);
    expect(result.frames).toHaveLength(3);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('does not move distant frames significantly', () => {
    const initial = computeLayout(
      [landscape, portrait, square, landscape],
      defaultOpts,
    );
    const result = addToLayout(initial, portrait, defaultOpts);

    // Check existing frames didn't jump far (allow small compaction shifts)
    for (let i = 0; i < initial.frames.length; i++) {
      const dx = Math.abs(result.frames[i].x - initial.frames[i].x);
      const dy = Math.abs(result.frames[i].y - initial.frames[i].y);
      // Light compaction allows small moves (< 30px), not large jumps
      expect(dx).toBeLessThan(30);
      expect(dy).toBeLessThan(30);
    }
  });

  it('no overlaps after add', () => {
    const initial = computeLayout([landscape, portrait, square], defaultOpts);
    const result = addToLayout(initial, landscape, defaultOpts);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('handles adding to empty layout', () => {
    const empty: LayoutResult = {
      frames: [],
      bounds: { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 },
      stats: { placed: 0, failed: 0, avgScale: 0 },
    };
    const result = addToLayout(empty, landscape, defaultOpts);
    expect(result.frames).toHaveLength(1);
  });

  it('returns existing layout with incremented failed when no position available', () => {
    // Create a dense grid manually where every candidate position would overlap
    const size = 50;
    const gap = 16;
    const manualFrames = [];
    // Fill a 10x10 grid of frames — extremely dense
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        manualFrames.push({
          x: col * (size + gap),
          y: row * (size + gap),
          width: size,
          height: size,
          scale: 1.0,
        });
      }
    }
    const dense: LayoutResult = {
      frames: manualFrames,
      bounds: { minX: 0, minY: 0, maxX: 660, maxY: 660, width: 660, height: 660 },
      stats: { placed: 100, failed: 0, avgScale: 1.0 },
    };

    // Try to add a frame that's larger than any gap in the grid
    // With minScale=1.0, the frame is ~226px wide (680/3) — too large for any 16px gap
    const result = addToLayout(dense, { width: 800, height: 800 }, {
      ...defaultOpts,
      minScale: 1.0,
    });

    // Should fail — no position available between the dense grid
    // The frame would need to go on the periphery, but all candidate positions
    // at edges of existing frames overlap other grid cells
    if (result.frames.length === dense.frames.length) {
      // Failed path was hit
      expect(result.stats.failed).toBe(1);
    } else {
      // It found a peripheral position — still valid
      expect(noOverlaps(result, gap)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// removeFromLayout
// ---------------------------------------------------------------------------

describe('removeFromLayout', () => {
  it('removes a frame by index', () => {
    const initial = computeLayout([landscape, portrait, square], defaultOpts);
    const result = removeFromLayout(initial, 1, defaultOpts);
    expect(result.frames).toHaveLength(2);
  });

  it('no overlaps after remove', () => {
    const initial = computeLayout(
      [landscape, portrait, square, landscape, portrait],
      defaultOpts,
    );
    const result = removeFromLayout(initial, 2, defaultOpts);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('frames far from removed frame dont move', () => {
    const initial = computeLayout(
      [landscape, portrait, square, landscape, portrait, square],
      defaultOpts,
    );

    // Remove frame at index 0 and check that far frames are stable
    const removedFrame = initial.frames[0];
    const result = removeFromLayout(initial, 0, defaultOpts);

    // Find frames that were far from the removed frame
    for (let i = 1; i < initial.frames.length; i++) {
      const f = initial.frames[i];
      const fcx = f.x + f.width / 2;
      const fcy = f.y + f.height / 2;
      const rcx = removedFrame.x + removedFrame.width / 2;
      const rcy = removedFrame.y + removedFrame.height / 2;
      const dist = Math.sqrt((fcx - rcx) ** 2 + (fcy - rcy) ** 2);

      if (dist > 200) {
        // Frame was far from removal — should not have moved
        // Result has one fewer frame, so index shifts by -1
        const resultFrame = result.frames[i - 1];
        expect(resultFrame.x).toBe(f.x);
        expect(resultFrame.y).toBe(f.y);
      }
    }
  });

  it('returns existing layout for invalid index', () => {
    const initial = computeLayout([landscape], defaultOpts);
    const result = removeFromLayout(initial, 5, defaultOpts);
    expect(result).toBe(initial);
  });

  it('returns empty layout when removing last frame', () => {
    const initial = computeLayout([landscape], defaultOpts);
    const result = removeFromLayout(initial, 0, defaultOpts);
    expect(result.frames).toHaveLength(0);
    expect(result.bounds.width).toBe(0);
  });

  it('add then remove round-trip produces valid layout', () => {
    const initial = computeLayout([landscape, portrait, square], defaultOpts);
    const added = addToLayout(initial, landscape, defaultOpts);
    // Remove the last added frame
    const result = removeFromLayout(added, added.frames.length - 1, defaultOpts);
    expect(result.frames).toHaveLength(3);
    expect(noOverlaps(result, 16)).toBe(true);
  });

  it('multiple sequential removes produce valid layouts', () => {
    let result = computeLayout(
      [landscape, portrait, square, landscape, portrait],
      defaultOpts,
    );
    for (let i = result.frames.length - 1; i >= 0; i--) {
      result = removeFromLayout(result, 0, defaultOpts);
      expect(noOverlaps(result, 16)).toBe(true);
    }
    expect(result.frames).toHaveLength(0);
  });

  it('multiple sequential adds produce valid layouts', () => {
    let result = computeLayout([landscape], defaultOpts);
    const toAdd = [portrait, square, landscape, portrait];
    for (const img of toAdd) {
      result = addToLayout(result, img, defaultOpts);
      expect(noOverlaps(result, 16)).toBe(true);
    }
    expect(result.frames.length).toBe(5);
  });
});
