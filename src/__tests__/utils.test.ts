import {
  createPRNG,
  resolveOptions,
  computeBaseSize,
  rectsOverlap,
  fitsWithoutOverlap,
  getEdgeContact,
  distToCenter,
  scorePosition,
  generateCandidates,
  compactToCenter,
  fillInteriorGaps,
  localCompact,
  expandFrames,
  resolveOverlaps,
  computeBounds,
  computeStats,
} from '../utils';
import type { PlacedFrame } from '../types';

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

describe('createPRNG', () => {
  it('produces deterministic output for the same seed', () => {
    const a = createPRNG(42);
    const b = createPRNG(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different output for different seeds', () => {
    const a = createPRNG(42);
    const b = createPRNG(99);
    const valA = a();
    const valB = b();
    expect(valA).not.toEqual(valB);
  });

  it('produces values in [0, 1)', () => {
    const rng = createPRNG(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveOptions
// ---------------------------------------------------------------------------

describe('resolveOptions', () => {
  it('applies defaults when no options provided', () => {
    const opts = resolveOptions();
    expect(opts.gap).toBe(16);
    expect(opts.minScale).toBe(0.45);
    expect(opts.padding).toBe(10);
    expect(opts.containerWidth).toBe(680);
    expect(opts.containerHeight).toBe(500);
    expect(opts.minItemWidth).toBe(0);
    expect(opts.maxItemWidth).toBe(Infinity);
    expect(typeof opts.seed).toBe('number');
  });

  it('uses provided values over defaults', () => {
    const opts = resolveOptions({ gap: 8, seed: 42, minScale: 0.3 });
    expect(opts.gap).toBe(8);
    expect(opts.seed).toBe(42);
    expect(opts.minScale).toBe(0.3);
    expect(opts.containerWidth).toBe(680); // still default
  });

  it('uses provided minItemWidth and maxItemWidth', () => {
    const opts = resolveOptions({ minItemWidth: 100, maxItemWidth: 400 });
    expect(opts.minItemWidth).toBe(100);
    expect(opts.maxItemWidth).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// computeBaseSize
// ---------------------------------------------------------------------------

describe('computeBaseSize', () => {
  it('computes landscape base size', () => {
    const size = computeBaseSize({ width: 1200, height: 800 }, 680, 500);
    expect(size.width).toBeGreaterThan(size.height);
    expect(size.width).toBeLessThanOrEqual(680 * 0.6);
  });

  it('computes portrait base size', () => {
    const size = computeBaseSize({ width: 800, height: 1200 }, 680, 500);
    expect(size.height).toBeGreaterThan(size.width);
    expect(size.height).toBeLessThanOrEqual(500 * 0.6);
  });

  it('computes square base size', () => {
    const size = computeBaseSize({ width: 800, height: 800 }, 680, 500);
    expect(size.width).toBe(size.height);
  });

  it('clamps oversized width', () => {
    // Very wide landscape — triggers w > maxW clamp
    const size = computeBaseSize({ width: 4000, height: 100 }, 680, 500);
    expect(size.width).toBeLessThanOrEqual(680 * 0.55);
    expect(size.height).toBeGreaterThan(0);
  });

  it('clamps oversized height', () => {
    // Very tall portrait — triggers h > maxH clamp
    const size = computeBaseSize({ width: 100, height: 4000 }, 680, 500);
    expect(size.height).toBeLessThanOrEqual(500 * 0.55);
    expect(size.width).toBeGreaterThan(0);
  });

  it('clamps both dimensions for extreme aspect ratios', () => {
    const size = computeBaseSize({ width: 1000, height: 990 }, 200, 200);
    expect(size.width).toBeLessThanOrEqual(200 * 0.6);
    expect(size.height).toBeLessThanOrEqual(200 * 0.6);
  });

  it('respects minItemWidth constraint', () => {
    // Without constraint, many images produce small frames
    const small = computeBaseSize({ width: 800, height: 600 }, 680, 500, 10);
    const constrained = computeBaseSize({ width: 800, height: 600 }, 680, 500, 10, 200);
    expect(constrained.width).toBeGreaterThanOrEqual(200);
    expect(constrained.width).toBeGreaterThanOrEqual(small.width);
  });

  it('respects maxItemWidth constraint', () => {
    const unconstrained = computeBaseSize({ width: 800, height: 600 }, 680, 500, 1);
    const constrained = computeBaseSize({ width: 800, height: 600 }, 680, 500, 1, 0, 150);
    expect(constrained.width).toBeLessThanOrEqual(150);
    expect(constrained.width).toBeLessThanOrEqual(unconstrained.width);
  });

  it('preserves aspect ratio with minItemWidth', () => {
    const size = computeBaseSize({ width: 800, height: 400 }, 680, 500, 10, 200);
    const aspect = size.width / size.height;
    expect(aspect).toBeCloseTo(2.0, 0);
  });

  it('preserves aspect ratio with maxItemWidth', () => {
    const size = computeBaseSize({ width: 800, height: 400 }, 680, 500, 1, 0, 150);
    const aspect = size.width / size.height;
    expect(aspect).toBeCloseTo(2.0, 0);
  });
});

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

describe('rectsOverlap', () => {
  it('detects overlapping rects', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 50, y: 50, width: 100, height: 100 };
    expect(rectsOverlap(a, b, 0)).toBe(true);
  });

  it('detects non-overlapping rects', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 200, y: 200, width: 100, height: 100 };
    expect(rectsOverlap(a, b, 0)).toBe(false);
  });

  it('accounts for gap', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 110, y: 0, width: 100, height: 100 };
    // Without gap, no overlap
    expect(rectsOverlap(a, b, 0)).toBe(false);
    // With 16px gap, they overlap (gap-expanded boxes intersect)
    expect(rectsOverlap(a, b, 16)).toBe(true);
  });

  it('considers exactly gap-distance apart as non-overlapping', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 116, y: 0, width: 100, height: 100 };
    expect(rectsOverlap(a, b, 16)).toBe(false);
  });
});

describe('fitsWithoutOverlap', () => {
  it('returns true for empty placed array', () => {
    const c = { x: 0, y: 0, width: 100, height: 100 };
    expect(fitsWithoutOverlap(c, [], 16)).toBe(true);
  });

  it('returns false when overlapping a placed frame', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const c = { x: 50, y: 50, width: 100, height: 100 };
    expect(fitsWithoutOverlap(c, placed, 16)).toBe(false);
  });

  it('returns true when properly spaced', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const c = { x: 116, y: 0, width: 100, height: 100 };
    expect(fitsWithoutOverlap(c, placed, 16)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge contact
// ---------------------------------------------------------------------------

describe('getEdgeContact', () => {
  const gap = 16;

  it('returns 0 contacts for distant frames', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const rect = { x: 500, y: 500, width: 100, height: 100 };
    const result = getEdgeContact(rect, placed, gap);
    expect(result.contacts).toBe(0);
    expect(result.contactLength).toBe(0);
  });

  it('detects single right-edge contact', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    // Rect placed exactly at gap distance to the right, same y
    const rect = { x: 116, y: 0, width: 100, height: 100 };
    const result = getEdgeContact(rect, placed, gap);
    expect(result.contacts).toBe(1);
    expect(result.contactLength).toBe(100);
  });

  it('detects multi-edge contact (corner position)', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
      { x: 116, y: 0, width: 100, height: 100, scale: 1 },
    ];
    // Frame below and between both, touching bottom edge of both
    const rect = { x: 58, y: 116, width: 100, height: 100 };
    const result = getEdgeContact(rect, placed, gap);
    expect(result.contacts).toBe(2);
    expect(result.contactLength).toBeGreaterThan(0);
  });

  it('measures contact length accurately', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 200, scale: 1 },
    ];
    // Rect to the right, only overlapping half the height
    const rect = { x: 116, y: 100, width: 100, height: 100 };
    const result = getEdgeContact(rect, placed, gap);
    expect(result.contacts).toBe(1);
    expect(result.contactLength).toBe(100); // overlap of 100px along the edge
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe('distToCenter', () => {
  it('returns 0 for a rect centered on the target', () => {
    const rect = { x: -50, y: -50, width: 100, height: 100 };
    expect(distToCenter(rect, 0, 0)).toBe(0);
  });

  it('returns correct euclidean distance', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    // Center of rect is (50, 50), distance to (0, 0) = sqrt(5000)
    expect(distToCenter(rect, 0, 0)).toBeCloseTo(Math.sqrt(5000));
  });
});

describe('scorePosition', () => {
  const gap = 16;

  it('scores closer positions higher due to center bias', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const near = { x: 116, y: 0, width: 100, height: 100, scale: 1 };
    const far = { x: 500, y: 0, width: 100, height: 100, scale: 1 };

    const nearScore = scorePosition(near, placed, 100, 50, gap, 0.5);
    const farScore = scorePosition(far, placed, 100, 50, gap, 0.5);
    expect(nearScore).toBeGreaterThan(farScore);
  });

  it('rewards more contacts with higher score', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
      { x: 0, y: 116, width: 100, height: 100, scale: 1 },
    ];

    // Position with 2 contacts (right of both)
    const twoContact = { x: 116, y: 58, width: 100, height: 100, scale: 1 };
    // Position with 1 contact (far right of first)
    const oneContact = { x: 116, y: 0, width: 100, height: 100, scale: 1 };

    const twoScore = scorePosition(twoContact, placed, 150, 100, gap, 0.5);
    const oneScore = scorePosition(oneContact, placed, 150, 100, gap, 0.5);
    expect(twoScore).toBeGreaterThan(oneScore);
  });
});

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

describe('generateCandidates', () => {
  it('generates candidates for a single placed frame', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const candidates = generateCandidates(placed, 80, 80, 1.0, 16);
    // 4 edges × 7 offsets = 28 candidates
    expect(candidates.length).toBe(28);
  });

  it('generates more candidates with more placed frames', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
      { x: 200, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const candidates = generateCandidates(placed, 80, 80, 1.0, 16);
    expect(candidates.length).toBe(56); // 2 frames × 28
  });

  it('candidates respect gap distance', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const candidates = generateCandidates(placed, 80, 80, 1.0, 16);

    for (const c of candidates) {
      // Each candidate should be snapped at gap distance from the placed frame's edge
      const rightSnap = Math.abs(c.x - (100 + 16)) < 0.01;
      const leftSnap = Math.abs(c.x - (-80 - 16)) < 0.01;
      const bottomSnap = Math.abs(c.y - (100 + 16)) < 0.01;
      const topSnap = Math.abs(c.y - (-80 - 16)) < 0.01;
      expect(rightSnap || leftSnap || bottomSnap || topSnap).toBe(true);
    }
  });

  it('preserves scale in candidates', () => {
    const placed: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const candidates = generateCandidates(placed, 60, 40, 0.7, 16);
    for (const c of candidates) {
      expect(c.scale).toBe(0.7);
      expect(c.width).toBe(60);
      expect(c.height).toBe(40);
    }
  });
});

// ---------------------------------------------------------------------------
// Compaction
// ---------------------------------------------------------------------------

describe('compactToCenter', () => {
  it('converges early when no frames can move', () => {
    // Single frame already at center — nothing to move, should break early
    const frames: PlacedFrame[] = [
      { x: -40, y: -40, width: 80, height: 80, scale: 1 },
    ];
    const result = compactToCenter(frames, 0, 0, 16, 15);
    expect(result).toHaveLength(1);
    // Frame barely moved since it was already centered
    expect(Math.abs(result[0].x - (-40))).toBeLessThan(10);
  });

  it('moves frames closer to center', () => {
    const frames: PlacedFrame[] = [
      { x: -200, y: 0, width: 100, height: 100, scale: 1 },
      { x: 200, y: 0, width: 100, height: 100, scale: 1 },
    ];
    const result = compactToCenter(frames, 0, 0, 16, 15);
    // Both frames should be closer to center than before
    expect(Math.abs(result[0].x + 50)).toBeLessThan(200);
    expect(Math.abs(result[1].x + 50)).toBeLessThan(250);
  });

  it('does not create overlaps', () => {
    const frames: PlacedFrame[] = [
      { x: -100, y: 0, width: 80, height: 80, scale: 1 },
      { x: 100, y: 0, width: 80, height: 80, scale: 1 },
      { x: 0, y: 100, width: 80, height: 80, scale: 1 },
    ];
    const result = compactToCenter(frames, 0, 50, 16, 15);

    // Check no pairs overlap
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(rectsOverlap(result[i], result[j], 16)).toBe(false);
      }
    }
  });

  it('returns unchanged frames if already compact', () => {
    const frames: PlacedFrame[] = [
      { x: -50, y: -50, width: 100, height: 100, scale: 1 },
    ];
    const result = compactToCenter(frames, 0, 0, 16, 15);
    expect(result[0].x).toBe(-50);
    expect(result[0].y).toBe(-50);
  });
});

// ---------------------------------------------------------------------------
// Interior gap filling
// ---------------------------------------------------------------------------

describe('fillInteriorGaps', () => {
  it('does not create overlaps', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1 },
      { x: 120, y: 0, width: 100, height: 100, scale: 1 },
      { x: 60, y: 120, width: 100, height: 100, scale: 1 },
    ];
    const result = fillInteriorGaps(frames, 110, 60, 16, 5);

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(rectsOverlap(result[i], result[j], 16)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Local compaction
// ---------------------------------------------------------------------------

describe('localCompact', () => {
  it('converges early when nothing can move', () => {
    // Single frame already at center
    const frames: PlacedFrame[] = [
      { x: -40, y: -40, width: 80, height: 80, scale: 1 },
    ];
    const result = localCompact(frames, { x: 0, y: 0 }, 0, 0, 16, 200, 8);
    expect(result).toHaveLength(1);
  });

  it('only moves frames within radius', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 80, height: 80, scale: 1 },       // near removal
      { x: 1000, y: 1000, width: 80, height: 80, scale: 1 },  // far away
    ];
    const result = localCompact(frames, { x: 50, y: 50 }, 50, 50, 16, 200, 8);

    // Far frame should not move
    expect(result[1].x).toBe(1000);
    expect(result[1].y).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Bounds & Stats
// ---------------------------------------------------------------------------

describe('computeBounds', () => {
  it('returns zeros for empty frames', () => {
    const bounds = computeBounds([]);
    expect(bounds).toEqual({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });

  it('computes correct bounds for placed frames', () => {
    const frames: PlacedFrame[] = [
      { x: 10, y: 20, width: 100, height: 50, scale: 1 },
      { x: 200, y: 30, width: 80, height: 120, scale: 1 },
    ];
    const bounds = computeBounds(frames);
    expect(bounds.minX).toBe(10);
    expect(bounds.minY).toBe(20);
    expect(bounds.maxX).toBe(280);
    expect(bounds.maxY).toBe(150);
    expect(bounds.width).toBe(270);
    expect(bounds.height).toBe(130);
  });
});

describe('computeStats', () => {
  it('computes correct stats', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1.0 },
      { x: 0, y: 0, width: 80, height: 80, scale: 0.8 },
    ];
    const stats = computeStats(frames, 3);
    expect(stats.placed).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.avgScale).toBeCloseTo(0.9);
  });

  it('handles empty frames', () => {
    const stats = computeStats([], 0);
    expect(stats.placed).toBe(0);
    expect(stats.failed).toBe(0);
    expect(stats.avgScale).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// expandFrames
// ---------------------------------------------------------------------------

describe('expandFrames', () => {
  it('returns frames unchanged when tightly packed', () => {
    // Two frames side by side with no room to grow
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1, imageIndex: 0 },
      { x: 108, y: 0, width: 100, height: 100, scale: 1, imageIndex: 1 },
    ];
    const result = expandFrames(frames, 8);
    // Should remain roughly the same size since there's no room
    expect(result).toHaveLength(2);
    result.forEach(f => {
      expect(f.width).toBeGreaterThan(0);
      expect(f.height).toBeGreaterThan(0);
    });
  });

  it('expands a small frame when surrounded by space', () => {
    // One small frame with lots of room around it
    const frames: PlacedFrame[] = [
      { x: 200, y: 200, width: 50, height: 50, scale: 0.5, imageIndex: 0 },
    ];
    const result = expandFrames(frames, 8);
    // With no neighbors, the frame should grow significantly
    expect(result[0].width).toBeGreaterThanOrEqual(50);
    expect(result[0].scale).toBeGreaterThanOrEqual(0.5);
  });

  it('expands frames that have room to grow beside neighbors', () => {
    // Two frames far apart — both should expand
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 80, height: 60, scale: 0.5, imageIndex: 0 },
      { x: 300, y: 0, width: 80, height: 60, scale: 0.5, imageIndex: 1 },
    ];
    const result = expandFrames(frames, 8);
    // Both frames should have grown since they're far apart
    expect(result[0].width).toBeGreaterThanOrEqual(80);
    expect(result[1].width).toBeGreaterThanOrEqual(80);
  });

  it('preserves aspect ratio during expansion', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 50, scale: 0.5, imageIndex: 0 },
    ];
    const originalAspect = frames[0].width / frames[0].height;
    const result = expandFrames(frames, 8);
    const resultAspect = result[0].width / result[0].height;
    expect(Math.abs(resultAspect - originalAspect)).toBeLessThan(0.01);
  });

  it('handles empty array', () => {
    const result = expandFrames([], 8);
    expect(result).toHaveLength(0);
  });

  it('does not create overlaps after expansion', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 80, height: 80, scale: 0.5, imageIndex: 0 },
      { x: 120, y: 0, width: 80, height: 80, scale: 0.5, imageIndex: 1 },
      { x: 60, y: 120, width: 80, height: 80, scale: 0.5, imageIndex: 2 },
    ];
    const gap = 8;
    const result = expandFrames(frames, gap);
    // Check no pairs overlap
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(rectsOverlap(result[i], result[j], gap)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// resolveOverlaps
// ---------------------------------------------------------------------------

describe('resolveOverlaps', () => {
  it('pushes overlapping frames apart', () => {
    // Two frames directly on top of each other
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1, imageIndex: 0 },
      { x: 10, y: 10, width: 100, height: 100, scale: 1, imageIndex: 1 },
    ];
    const result = resolveOverlaps(frames, 8);
    // They should have moved apart
    const dx = Math.abs(result[0].x - result[1].x);
    const dy = Math.abs(result[0].y - result[1].y);
    expect(dx + dy).toBeGreaterThan(20); // more separated than before
  });

  it('returns frames unchanged when no overlaps exist', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1, imageIndex: 0 },
      { x: 200, y: 0, width: 100, height: 100, scale: 1, imageIndex: 1 },
    ];
    const result = resolveOverlaps(frames, 8);
    expect(result[0].x).toBe(0);
    expect(result[0].y).toBe(0);
    expect(result[1].x).toBe(200);
    expect(result[1].y).toBe(0);
  });

  it('handles frames at the exact same position', () => {
    // Two frames at identical positions (dist < 0.1 branch)
    const frames: PlacedFrame[] = [
      { x: 50, y: 50, width: 100, height: 100, scale: 1, imageIndex: 0 },
      { x: 50, y: 50, width: 100, height: 100, scale: 1, imageIndex: 1 },
    ];
    const result = resolveOverlaps(frames, 8);
    // Should still push them apart using the fallback direction
    const dx = Math.abs(result[0].x - result[1].x);
    expect(dx).toBeGreaterThan(0);
  });

  it('handles empty array', () => {
    const result = resolveOverlaps([], 8);
    expect(result).toHaveLength(0);
  });

  it('handles single frame', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1, imageIndex: 0 },
    ];
    const result = resolveOverlaps(frames, 8);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(0);
  });

  it('resolves three-way overlap', () => {
    const frames: PlacedFrame[] = [
      { x: 0, y: 0, width: 100, height: 100, scale: 1, imageIndex: 0 },
      { x: 20, y: 20, width: 100, height: 100, scale: 1, imageIndex: 1 },
      { x: 40, y: 40, width: 100, height: 100, scale: 1, imageIndex: 2 },
    ];
    const result = resolveOverlaps(frames, 4, 50);
    // After resolution, frames should be at least as spread out
    const totalSpread = result.reduce((sum, f) => sum + Math.abs(f.x) + Math.abs(f.y), 0);
    const originalSpread = frames.reduce((sum, f) => sum + Math.abs(f.x) + Math.abs(f.y), 0);
    expect(totalSpread).toBeGreaterThanOrEqual(originalSpread);
  });
});
