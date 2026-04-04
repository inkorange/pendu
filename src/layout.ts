import type { PenduImageData, PlacedFrame, LayoutOptions, LayoutResult } from './types';
import {
  createPRNG,
  resolveOptions,
  computeBaseSize,
  fitsWithoutOverlap,
  generateCandidates,
  scorePosition,
  compactToCenter,
  fillInteriorGaps,
  expandFrames,
  localCompact,
  resolveOverlaps,
  computeBounds,
  computeStats,
} from './utils';

// ---------------------------------------------------------------------------
// Full layout computation
// ---------------------------------------------------------------------------

export function computeLayout(
  images: PenduImageData[],
  options?: LayoutOptions,
): LayoutResult {
  const opts = resolveOptions(options);
  const prng = createPRNG(opts.seed);

  if (images.length === 0) {
    return {
      frames: [],
      bounds: { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 },
      stats: { placed: 0, failed: 0, avgScale: 0 },
    };
  }

  const cw = opts.containerWidth;
  const ch = opts.containerHeight;
  const centerX = cw / 2;
  const centerY = ch / 2;
  const placed: PlacedFrame[] = [];
  let failed = 0;

  // Place first frame at center
  const firstBase = computeBaseSize(images[0], cw, ch, images.length, opts.minItemWidth, opts.maxItemWidth);
  placed.push({
    width: firstBase.width,
    height: firstBase.height,
    x: centerX - firstBase.width / 2,
    y: centerY - firstBase.height / 2,
    scale: 1.0,
  });

  const scaleSteps = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, opts.minScale];

  // Place remaining frames — prefer positions that stay within the
  // container bounds and fill empty space
  for (let i = 1; i < images.length; i++) {
    const base = computeBaseSize(images[i], cw, ch, images.length, opts.minItemWidth, opts.maxItemWidth);
    let bestCandidate: PlacedFrame | null = null;
    let bestScore = -Infinity;

    for (const scale of scaleSteps) {
      if (scale < opts.minScale) continue;

      const w = Math.round(base.width * scale);
      const h = Math.round(base.height * scale);
      const candidates = generateCandidates(placed, w, h, scale, opts.gap);

      for (const c of candidates) {
        if (!fitsWithoutOverlap(c, placed, opts.gap)) continue;

        let score = scorePosition(
          c, placed, centerX, centerY, opts.gap, prng(), cw, ch,
        );

        // Strongly reward candidates that stay within container bounds
        const inBoundsX = c.x >= 0 && c.x + c.width <= cw;
        const inBoundsY = c.y >= 0 && c.y + c.height <= ch;
        if (inBoundsX && inBoundsY) {
          score += 200;
        } else {
          // Penalize based on how far outside the bounds
          const overLeft = Math.max(0, -c.x);
          const overRight = Math.max(0, c.x + c.width - cw);
          const overTop = Math.max(0, -c.y);
          const overBottom = Math.max(0, c.y + c.height - ch);
          score -= (overLeft + overRight + overTop + overBottom) * 3;
        }

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = {
            width: c.width,
            height: c.height,
            x: c.x,
            y: c.y,
            scale: c.scale,
          };
        }
      }

      if (bestCandidate !== null) break;
    }

    if (bestCandidate) {
      placed.push(bestCandidate);
    } else {
      failed++;
    }
  }

  // Compaction — pull toward center but respect container shape
  let frames = compactToCenter(placed, centerX, centerY, opts.gap, 15);
  frames = fillInteriorGaps(frames, centerX, centerY, opts.gap, 5);

  // Expansion — grow frames to fill available space
  frames = expandFrames(frames, opts.gap, 1.5, 5);

  // Re-center the cluster within the container
  if (frames.length > 0) {
    const postBounds = computeBounds(frames);
    const clusterCX = postBounds.minX + postBounds.width / 2;
    const clusterCY = postBounds.minY + postBounds.height / 2;
    const offsetX = centerX - clusterCX;
    const offsetY = centerY - clusterCY;
    frames = frames.map((f) => ({ ...f, x: f.x + offsetX, y: f.y + offsetY }));
  }

  return {
    frames,
    bounds: computeBounds(frames),
    stats: computeStats(frames, images.length),
  };
}

// ---------------------------------------------------------------------------
// Incremental add
// ---------------------------------------------------------------------------

export function addToLayout(
  existing: LayoutResult,
  newImage: PenduImageData,
  options?: LayoutOptions,
): LayoutResult {
  const opts = resolveOptions(options);
  const prng = createPRNG(opts.seed + existing.frames.length);
  const frames = existing.frames.map((f) => ({ ...f }));

  if (frames.length === 0) {
    return computeLayout([newImage], options);
  }

  const bounds = computeBounds(frames);
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;

  const totalAfterAdd = frames.length + 1;
  const base = computeBaseSize(newImage, opts.containerWidth, opts.containerHeight, totalAfterAdd, opts.minItemWidth, opts.maxItemWidth);
  const scaleSteps = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, opts.minScale];

  let bestCandidate: PlacedFrame | null = null;
  let bestScore = -Infinity;

  for (const scale of scaleSteps) {
    if (scale < opts.minScale) continue;

    const w = Math.round(base.width * scale);
    const h = Math.round(base.height * scale);
    const candidates = generateCandidates(frames, w, h, scale, opts.gap);

    for (const c of candidates) {
      if (!fitsWithoutOverlap(c, frames, opts.gap)) continue;

      const score = scorePosition(
        c, frames, centerX, centerY, opts.gap, prng(), opts.containerWidth, opts.containerHeight,
      );
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = {
          width: c.width,
          height: c.height,
          x: c.x,
          y: c.y,
          scale: c.scale,
        };
      }
    }

    if (bestCandidate !== null) break;
  }

  if (!bestCandidate) {
    return {
      frames: existing.frames,
      bounds: existing.bounds,
      stats: {
        ...existing.stats,
        failed: existing.stats.failed + 1,
      },
    };
  }

  frames.push(bestCandidate);

  const compacted = compactToCenter(frames, centerX, centerY, opts.gap, 3);

  return {
    frames: compacted,
    bounds: computeBounds(compacted),
    stats: computeStats(compacted, existing.stats.placed + 1),
  };
}

// ---------------------------------------------------------------------------
// Incremental remove
// ---------------------------------------------------------------------------

export function removeFromLayout(
  existing: LayoutResult,
  removeIndex: number,
  options?: LayoutOptions,
): LayoutResult {
  if (removeIndex < 0 || removeIndex >= existing.frames.length) {
    return existing;
  }

  const opts = resolveOptions(options);
  const removedFrame = existing.frames[removeIndex];
  const removalPoint = {
    x: removedFrame.x + removedFrame.width / 2,
    y: removedFrame.y + removedFrame.height / 2,
  };

  const frames = existing.frames.filter((_, i) => i !== removeIndex).map((f) => ({ ...f }));

  if (frames.length === 0) {
    return {
      frames: [],
      bounds: { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 },
      stats: { placed: 0, failed: 0, avgScale: 0 },
    };
  }

  const bounds = computeBounds(frames);
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;

  const compacted = localCompact(
    frames,
    removalPoint,
    centerX,
    centerY,
    opts.gap,
    200,
    8,
  );

  return {
    frames: compacted,
    bounds: computeBounds(compacted),
    stats: computeStats(compacted, compacted.length),
  };
}
