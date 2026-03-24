import type {
  PenduImageData,
  PlacedFrame,
  LayoutOptions,
  ResolvedOptions,
  LayoutBounds,
  LayoutStats,
  EdgeContactResult,
} from './types';

const EDGE_TOLERANCE = 1.0;

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

export function createPRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export function resolveOptions(options?: LayoutOptions): ResolvedOptions {
  return {
    gap: options?.gap ?? 16,
    minScale: options?.minScale ?? 0.45,
    padding: options?.padding ?? 10,
    seed: options?.seed ?? (Date.now() ^ (Math.random() * 0x100000000)),
    containerWidth: options?.containerWidth ?? 680,
    containerHeight: options?.containerHeight ?? 500,
  };
}

// ---------------------------------------------------------------------------
// Base frame sizing
// ---------------------------------------------------------------------------

export function computeBaseSize(
  image: PenduImageData,
  containerWidth: number,
  containerHeight: number,
  totalImages: number = 1,
): { width: number; height: number } {
  const aspect = image.width / image.height;

  // Size frames so the total cluster area fills the container generously.
  // The organic layout has gaps and imperfect packing, so we overshoot by
  // a fill factor to compensate. With 6 images this targets ~85% fill;
  // the expansion pass and fit-scale handle any overflow.
  const containerArea = containerWidth * containerHeight;
  const fillFactor = 1.4 + (0.3 / Math.max(1, totalImages)); // more generous for fewer images
  const targetFrameArea = (containerArea * fillFactor) / Math.max(1, totalImages);
  // Derive width from area: area = w * h = w * (w / aspect) = w² / aspect
  // So w = sqrt(area * aspect)
  let w = Math.sqrt(targetFrameArea * aspect);
  let h = w / aspect;

  // Clamp so no single frame dominates the container
  const maxW = containerWidth * 0.55;
  const maxH = containerHeight * 0.55;
  if (w > maxW) { w = maxW; h = w / aspect; }
  if (h > maxH) { h = maxH; w = h * aspect; }

  // Minimum size — but don't let it override the max clamp
  const minDim = 40;
  w = Math.max(minDim, Math.min(w, maxW));
  h = Math.max(minDim, Math.min(h, maxH));

  return { width: Math.round(w), height: Math.round(h) };
}

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

const OVERLAP_EPSILON = 0.01;

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap: number,
): boolean {
  // Use small epsilon to handle floating point imprecision
  const g = gap - OVERLAP_EPSILON;
  return !(
    a.x + a.width + g <= b.x ||
    b.x + b.width + g <= a.x ||
    a.y + a.height + g <= b.y ||
    b.y + b.height + g <= a.y
  );
}

export function fitsWithoutOverlap(
  candidate: { x: number; y: number; width: number; height: number },
  placed: PlacedFrame[],
  gap: number,
): boolean {
  for (const p of placed) {
    if (rectsOverlap(candidate, p, gap)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Edge contact detection
// ---------------------------------------------------------------------------

export function getEdgeContact(
  rect: { x: number; y: number; width: number; height: number },
  placed: PlacedFrame[],
  gap: number,
): EdgeContactResult {
  let contacts = 0;
  let contactLength = 0;

  for (const p of placed) {
    // Right edge of p → left edge of rect
    if (Math.abs(rect.x - (p.x + p.width + gap)) < EDGE_TOLERANCE) {
      const overlap =
        Math.min(rect.y + rect.height, p.y + p.height) - Math.max(rect.y, p.y);
      if (overlap > EDGE_TOLERANCE) {
        contacts++;
        contactLength += overlap;
      }
    }

    // Left edge of p → right edge of rect
    if (Math.abs(p.x - gap - (rect.x + rect.width)) < EDGE_TOLERANCE) {
      const overlap =
        Math.min(rect.y + rect.height, p.y + p.height) - Math.max(rect.y, p.y);
      if (overlap > EDGE_TOLERANCE) {
        contacts++;
        contactLength += overlap;
      }
    }

    // Bottom edge of p → top edge of rect
    if (Math.abs(rect.y - (p.y + p.height + gap)) < EDGE_TOLERANCE) {
      const overlap =
        Math.min(rect.x + rect.width, p.x + p.width) - Math.max(rect.x, p.x);
      if (overlap > EDGE_TOLERANCE) {
        contacts++;
        contactLength += overlap;
      }
    }

    // Top edge of p → bottom edge of rect
    if (Math.abs(p.y - gap - (rect.y + rect.height)) < EDGE_TOLERANCE) {
      const overlap =
        Math.min(rect.x + rect.width, p.x + p.width) - Math.max(rect.x, p.x);
      if (overlap > EDGE_TOLERANCE) {
        contacts++;
        contactLength += overlap;
      }
    }
  }

  return { contacts, contactLength };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function distToCenter(
  rect: { x: number; y: number; width: number; height: number },
  centerX: number,
  centerY: number,
): number {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2);
}

export function scorePosition(
  candidate: { x: number; y: number; width: number; height: number; scale: number },
  placed: PlacedFrame[],
  centerX: number,
  centerY: number,
  gap: number,
  random: number,
  containerWidth: number = 680,
  containerHeight: number = 680,
): number {
  const { contacts, contactLength } = getEdgeContact(candidate, placed, gap);

  // Use aspect-weighted distance so wide containers don't penalize
  // horizontal spread as much as vertical spread (and vice versa)
  const cx = candidate.x + candidate.width / 2;
  const cy = candidate.y + candidate.height / 2;
  const normalizedDx = (cx - centerX) / (containerWidth || 1);
  const normalizedDy = (cy - centerY) / (containerHeight || 1);
  const dist = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy) * Math.max(containerWidth, containerHeight);

  // Randomness scales inversely with placed count — more organic variety
  // when few frames are placed, tighter clustering as the gallery fills
  const randomWeight = Math.max(20, 80 - placed.length * 8);

  // Directional diversity: reward candidates that balance the cluster
  // toward a square/diamond shape radiating from center.
  let diversityBonus = 0;
  {
    const candidateCX = candidate.x + candidate.width / 2;
    const candidateCY = candidate.y + candidate.height / 2;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;
    for (const p of placed) {
      const pcx = p.x + p.width / 2;
      const pcy = p.y + p.height / 2;
      sumX += pcx;
      sumY += pcy;
      if (p.x < minX) minX = p.x;
      if (p.x + p.width > maxX) maxX = p.x + p.width;
      if (p.y < minY) minY = p.y;
      if (p.y + p.height > maxY) maxY = p.y + p.height;
    }

    const clusterW = maxX - minX || 1;
    const clusterH = maxY - minY || 1;
    const aspectRatio = clusterW / clusterH;

    // Compute cluster centroid — candidates on the opposite side
    // of the centroid from the cluster's center of mass get a bonus.
    // This prevents staircase growth in one direction.
    const centroidX = sumX / placed.length;
    const centroidY = sumY / placed.length;
    const clusterMidX = (minX + maxX) / 2;
    const clusterMidY = (minY + maxY) / 2;

    // How off-center is the mass? Positive = mass is right/below of geometric center
    const xImbalance = centroidX - clusterMidX;
    const yImbalance = centroidY - clusterMidY;

    // Reward candidates that counterbalance the mass
    // If mass is shifted right, reward candidates to the left (and vice versa)
    const xBalance = (candidateCX < clusterMidX && xImbalance > 0) ||
                     (candidateCX > clusterMidX && xImbalance < 0)
                     ? Math.abs(xImbalance) * 2 : 0;
    const yBalance = (candidateCY < clusterMidY && yImbalance > 0) ||
                     (candidateCY > clusterMidY && yImbalance < 0)
                     ? Math.abs(yImbalance) * 2 : 0;

    diversityBonus += xBalance + yBalance;

    // Aspect ratio correction: reward spreading in the short axis
    if (aspectRatio < 0.8) {
      // Taller than wide → reward horizontal extension
      const extendsH = candidateCX < minX || candidateCX > maxX;
      if (extendsH) diversityBonus += 300 * (1 / aspectRatio);
    } else if (aspectRatio > 1.3) {
      // Wider than tall → reward vertical extension
      const extendsV = candidateCY < minY || candidateCY > maxY;
      if (extendsV) diversityBonus += 300 * aspectRatio;
    }
  }

  return (
    contacts * 150 +
    contactLength * 3 -
    dist * 0.5 +
    candidate.scale * 10 +
    random * randomWeight +
    diversityBonus
  );
}

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

export function generateCandidates(
  placed: PlacedFrame[],
  width: number,
  height: number,
  scale: number,
  gap: number,
): Array<{ x: number; y: number; width: number; height: number; scale: number }> {
  const candidates: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  }> = [];

  for (const p of placed) {
    // Y offsets for horizontal snapping (left/right of p)
    const yOffsets = [
      p.y,                                    // top-aligned
      p.y + p.height - height,                // bottom-aligned
      p.y + (p.height - height) / 2,          // center-aligned
      p.y - height / 3,                       // offset up 1/3
      p.y + p.height - (height * 2) / 3,      // offset down 1/3
      p.y - height * 0.6,                     // offset up 60%
      p.y + p.height - height * 0.4,          // offset down 40%
    ];

    // X offsets for vertical snapping (above/below p)
    const xOffsets = [
      p.x,                                    // left-aligned
      p.x + p.width - width,                  // right-aligned
      p.x + (p.width - width) / 2,            // center-aligned
      p.x - width / 3,                        // offset left 1/3
      p.x + p.width - (width * 2) / 3,        // offset right 1/3
      p.x - width * 0.6,                      // offset left 60%
      p.x + p.width - width * 0.4,            // offset right 40%
    ];

    // Right edge of p
    const rightX = p.x + p.width + gap;
    for (const y of yOffsets) {
      candidates.push({ x: rightX, y, width, height, scale });
    }

    // Left edge of p
    const leftX = p.x - width - gap;
    for (const y of yOffsets) {
      candidates.push({ x: leftX, y, width, height, scale });
    }

    // Bottom edge of p
    const bottomY = p.y + p.height + gap;
    for (const x of xOffsets) {
      candidates.push({ x, y: bottomY, width, height, scale });
    }

    // Top edge of p
    const topY = p.y - height - gap;
    for (const x of xOffsets) {
      candidates.push({ x, y: topY, width, height, scale });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Compaction
// ---------------------------------------------------------------------------

export function compactToCenter(
  frames: PlacedFrame[],
  centerX: number,
  centerY: number,
  gap: number,
  iterations: number = 15,
): PlacedFrame[] {
  const result = frames.map((f) => ({ ...f }));

  for (let iter = 0; iter < iterations; iter++) {
    const sorted = [...result].sort(
      (a, b) => distToCenter(a, centerX, centerY) - distToCenter(b, centerX, centerY),
    );

    // Compute current cluster aspect ratio to bias compaction
    // toward making the cluster more square/diamond shaped
    const bounds = computeBounds(result);
    const clusterW = bounds.width || 1;
    const clusterH = bounds.height || 1;
    const aspect = clusterW / clusterH;

    // Dampen the axis that's already too short
    // aspect < 1 = taller than wide → reduce vertical pull
    // aspect > 1 = wider than tall → reduce horizontal pull
    const xDampen = aspect > 1.3 ? 0.3 : 1.0;
    const yDampen = aspect < 0.7 ? 0.3 : 1.0;

    let moved = false;

    for (const frame of sorted) {
      const idx = result.indexOf(frame);
      const fcx = frame.x + frame.width / 2;
      const fcy = frame.y + frame.height / 2;

      const dx = centerX - fcx;
      const dy = centerY - fcy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      const stepSize = Math.max(1, 8 - iter * 0.4);
      const nx = (dx / dist) * stepSize * xDampen;
      const ny = (dy / dist) * stepSize * yDampen;

      const moved_frame = { ...frame, x: frame.x + nx, y: frame.y + ny };
      const others = result.filter((_, i) => i !== idx);

      if (fitsWithoutOverlap(moved_frame, others, gap)) {
        result[idx] = { ...result[idx], x: moved_frame.x, y: moved_frame.y };
        moved = true;
      }
    }

    if (!moved) break;
  }

  return result;
}

export function fillInteriorGaps(
  frames: PlacedFrame[],
  centerX: number,
  centerY: number,
  gap: number,
  passes: number = 5,
): PlacedFrame[] {
  const result = frames.map((f) => ({ ...f }));
  const DIRECTIONS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.7, 0.7],
    [-0.7, 0.7],
    [0.7, -0.7],
    [-0.7, -0.7],
  ];
  const STEP = 2;

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < result.length; i++) {
      const frame = result[i];
      const others = result.filter((_, j) => j !== i);
      const currentContact = getEdgeContact(frame, others, gap).contactLength;
      const currentDist = distToCenter(frame, centerX, centerY);
      let bestScore = currentContact * 2 - currentDist;
      let bestX = frame.x;
      let bestY = frame.y;

      for (const [dx, dy] of DIRECTIONS) {
        const shifted = {
          ...frame,
          x: frame.x + dx * STEP,
          y: frame.y + dy * STEP,
        };

        if (fitsWithoutOverlap(shifted, others, gap)) {
          const contact = getEdgeContact(shifted, others, gap).contactLength;
          const dist = distToCenter(shifted, centerX, centerY);
          const score = contact * 2 - dist;

          if (score > bestScore) {
            bestScore = score;
            bestX = shifted.x;
            bestY = shifted.y;
          }
        }
      }

      result[i] = { ...result[i], x: bestX, y: bestY };
    }
  }

  return result;
}

export function localCompact(
  frames: PlacedFrame[],
  removalPoint: { x: number; y: number },
  centerX: number,
  centerY: number,
  gap: number,
  radius: number = 200,
  iterations: number = 8,
): PlacedFrame[] {
  const result = frames.map((f) => ({ ...f }));

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;

    for (let i = 0; i < result.length; i++) {
      const frame = result[i];
      const fcx = frame.x + frame.width / 2;
      const fcy = frame.y + frame.height / 2;

      // Only move frames within radius of the removal point
      const distToRemoval = Math.sqrt(
        (fcx - removalPoint.x) ** 2 + (fcy - removalPoint.y) ** 2,
      );
      if (distToRemoval > radius) continue;

      const dx = centerX - fcx;
      const dy = centerY - fcy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      const stepSize = Math.max(1, 6 - iter * 0.5);
      const nx = (dx / dist) * stepSize;
      const ny = (dy / dist) * stepSize;

      const moved_frame = { ...frame, x: frame.x + nx, y: frame.y + ny };
      const others = result.filter((_, j) => j !== i);

      if (fitsWithoutOverlap(moved_frame, others, gap)) {
        result[i] = { ...result[i], x: moved_frame.x, y: moved_frame.y };
        moved = true;
      }
    }

    if (!moved) break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Frame expansion — grow frames to fill available space
// ---------------------------------------------------------------------------

export function expandFrames(
  frames: PlacedFrame[],
  gap: number,
  maxScale: number = 3.0,
  passes: number = 5,
): PlacedFrame[] {
  const result = frames.map((f) => ({ ...f }));

  // Try expanding a frame with a given anchor bias (0 = grow from left/top, 0.5 = center, 1 = right/bottom)
  function tryExpand(
    frame: PlacedFrame,
    others: PlacedFrame[],
    aspect: number,
    anchorX: number,
    anchorY: number,
    maxGrowth: number,
  ): { factor: number; x: number; y: number; w: number; h: number } | null {
    const origW = frame.width;
    const origH = frame.height;
    let lo = 1.0;
    let hi = maxGrowth;
    if (hi <= 1.01) return null;

    // Test upper bound first
    const maxW = origW * hi;
    const maxH = maxW / aspect;
    const maxX = frame.x - (maxW - origW) * anchorX;
    const maxY = frame.y - (maxH - origH) * anchorY;
    if (fitsWithoutOverlap({ x: maxX, y: maxY, width: maxW, height: maxH }, others, gap)) {
      return { factor: hi, x: maxX, y: maxY, w: maxW, h: maxH };
    }

    for (let step = 0; step < 10; step++) {
      const mid = (lo + hi) / 2;
      const w = origW * mid;
      const h = w / aspect;
      const x = frame.x - (w - origW) * anchorX;
      const y = frame.y - (h - origH) * anchorY;
      if (fitsWithoutOverlap({ x, y, width: w, height: h }, others, gap)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    if (lo > 1.02) {
      const w = origW * lo;
      const h = w / aspect;
      const x = frame.x - (w - origW) * anchorX;
      const y = frame.y - (h - origH) * anchorY;
      return { factor: lo, x, y, w, h };
    }
    return null;
  }

  for (let pass = 0; pass < passes; pass++) {
    let anyGrew = false;

    for (let i = 0; i < result.length; i++) {
      const frame = result[i];
      const aspect = frame.width / frame.height;
      const others = result.filter((_, j) => j !== i);
      const maxGrowth = maxScale / frame.scale;

      // Try multiple anchor points: center, then biased toward each direction
      const anchors: [number, number][] = [
        [0.5, 0.5],  // center
        [0, 0.5],    // grow rightward
        [1, 0.5],    // grow leftward
        [0.5, 0],    // grow downward
        [0.5, 1],    // grow upward
      ];

      let best: ReturnType<typeof tryExpand> = null;
      for (const [ax, ay] of anchors) {
        const attempt = tryExpand(frame, others, aspect, ax, ay, maxGrowth);
        if (attempt && (!best || attempt.factor > best.factor)) {
          best = attempt;
        }
      }

      if (best) {
        result[i] = { ...result[i], x: best.x, y: best.y, width: best.w, height: best.h, scale: frame.scale * best.factor };
        anyGrew = true;
      }
    }

    if (!anyGrew) break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Overlap resolution (push apart after scaling)
// ---------------------------------------------------------------------------

export function resolveOverlaps(
  frames: PlacedFrame[],
  gap: number,
  iterations: number = 30,
): PlacedFrame[] {
  const result = frames.map((f) => ({ ...f }));

  for (let iter = 0; iter < iterations; iter++) {
    let hasOverlap = false;

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (!rectsOverlap(result[i], result[j], gap)) continue;
        hasOverlap = true;

        const a = result[i];
        const b = result[j];

        // Calculate overlap vector between centers
        const acx = a.x + a.width / 2;
        const acy = a.y + a.height / 2;
        const bcx = b.x + b.width / 2;
        const bcy = b.y + b.height / 2;

        let dx = bcx - acx;
        let dy = bcy - acy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) {
          dx = 1;
          dy = 0;
        } else {
          dx /= dist;
          dy /= dist;
        }

        // Push each frame apart, but only if the move doesn't create new overlaps
        const step = Math.max(2, gap * 0.5);

        const newA = { ...a, x: a.x - dx * step, y: a.y - dy * step };
        const othersA = result.filter((_, k) => k !== i && k !== j);
        if (fitsWithoutOverlap(newA, othersA, gap)) {
          result[i] = newA;
        }

        const newB = { ...b, x: b.x + dx * step, y: b.y + dy * step };
        const othersB = result.filter((_, k) => k !== i && k !== j);
        if (fitsWithoutOverlap(newB, othersB, gap)) {
          result[j] = newB;
        }
      }
    }

    if (!hasOverlap) break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Bounds & Stats
// ---------------------------------------------------------------------------

export function computeBounds(frames: PlacedFrame[]): LayoutBounds {
  if (frames.length === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const f of frames) {
    if (f.x < minX) minX = f.x;
    if (f.y < minY) minY = f.y;
    if (f.x + f.width > maxX) maxX = f.x + f.width;
    if (f.y + f.height > maxY) maxY = f.y + f.height;
  }

  return { width: maxX - minX, height: maxY - minY, minX, minY, maxX, maxY };
}

export function computeStats(frames: PlacedFrame[], totalInput: number): LayoutStats {
  const placed = frames.length;
  const failed = totalInput - placed;
  const avgScale =
    placed > 0 ? frames.reduce((sum, f) => sum + f.scale, 0) / placed : 0;

  return { placed, failed, avgScale };
}
