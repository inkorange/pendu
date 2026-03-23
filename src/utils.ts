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
): { width: number; height: number } {
  const aspect = image.width / image.height;
  let w: number;
  let h: number;

  if (aspect >= 1) {
    // Landscape or square
    w = containerWidth / 3;
    h = w / aspect;
  } else {
    // Portrait
    h = containerHeight / 3;
    w = h * aspect;
  }

  // Clamp so no single frame dominates the container
  const maxW = containerWidth * 0.5;
  const maxH = containerHeight * 0.5;
  if (w > maxW) {
    w = maxW;
    h = w / aspect;
  }
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }

  return { width: Math.round(w), height: Math.round(h) };
}

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap: number,
): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
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
): number {
  const { contacts, contactLength } = getEdgeContact(candidate, placed, gap);
  const dist = distToCenter(candidate, centerX, centerY);

  return (
    contacts * 150 +
    contactLength * 3 -
    dist * 0.8 +
    candidate.scale * 10 +
    random * 8
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
      p.y,
      p.y + p.height - height,
      p.y + (p.height - height) / 2,
      p.y - height / 3,
      p.y + p.height - (height * 2) / 3,
    ];

    // X offsets for vertical snapping (above/below p)
    const xOffsets = [
      p.x,
      p.x + p.width - width,
      p.x + (p.width - width) / 2,
      p.x - width / 3,
      p.x + p.width - (width * 2) / 3,
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
      const nx = (dx / dist) * stepSize;
      const ny = (dy / dist) * stepSize;

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
// Overlap resolution (push apart after scaling)
// ---------------------------------------------------------------------------

export function resolveOverlaps(
  frames: PlacedFrame[],
  gap: number,
  iterations: number = 20,
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
          // Nearly coincident — push in arbitrary direction
          dx = 1;
          dy = 0;
        } else {
          dx /= dist;
          dy /= dist;
        }

        // Push apart by a small step
        const step = Math.max(2, gap * 0.5);
        result[i] = { ...result[i], x: a.x - dx * step, y: a.y - dy * step };
        result[j] = { ...result[j], x: b.x + dx * step, y: b.y + dy * step };
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
