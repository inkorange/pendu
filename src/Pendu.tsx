'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';
import { computeLayout } from './layout';
import { PenduImage } from './PenduImage';
import type { PenduImageData, LayoutResult } from './types';
import type { PenduImageProps } from './PenduImage';

// ---------------------------------------------------------------------------
// CSS variable defaults (inline — no SCSS import at runtime)
// ---------------------------------------------------------------------------

const CSS_VAR_DEFAULTS: Record<string, string> = {
  '--pendu-bg': 'transparent',
  '--pendu-gap': '16px',
  '--pendu-padding': '10px',
  '--pendu-frame-radius': '0',
  '--pendu-frame-shadow': 'none',
  '--pendu-frame-border': 'none',
  '--pendu-frame-overflow': 'visible',
  '--pendu-transition-duration': '300ms',
  '--pendu-transition-easing': 'ease-out',
  '--pendu-skeleton-bg': '#e0e0e0',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PenduProps {
  gap?: number;
  minScale?: number;
  padding?: number;
  seed?: number;
  animate?: boolean;
  animationDuration?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

interface ChildImageData {
  key: string;
  props: PenduImageProps;
  imageData: PenduImageData;
}

interface FrameSnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractChildren(children: React.ReactNode): ChildImageData[] {
  const result: ChildImageData[] = [];
  React.Children.forEach(children, (child, index) => {
    if (!React.isValidElement(child)) return;
    if (child.type !== PenduImage) return;

    const props = child.props as PenduImageProps;
    result.push({
      key: (child.key != null ? String(child.key) : String(index)),
      props,
      imageData: { width: props.width, height: props.height },
    });
  });
  return result;
}

function buildLayoutKey(items: ChildImageData[], gap: number, minScale: number, seed: number | undefined): string {
  const dims = items.map((c) => `${c.key}:${c.imageData.width}x${c.imageData.height}`).join(',');
  return `${dims}|${gap}|${minScale}|${seed ?? 'auto'}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PenduComponent({
  gap = 16,
  minScale = 0.45,
  padding = 10,
  seed,
  animate = true,
  animationDuration = 300,
  className,
  style,
  children,
}: PenduProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef<number>(seed ?? Math.floor(Math.random() * 0x100000000));
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Track previous frame positions for FLIP (keyed by child key)
  const prevSnapshotsRef = useRef<Map<string, FrameSnapshot>>(new Map());
  const prevKeysRef = useRef<Set<string>>(new Set());
  const isFirstRenderRef = useRef(true);

  const effectiveSeed = seed ?? seedRef.current;

  // ---------------------------------------------------------------------------
  // ResizeObserver
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(Math.round(width));
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Extract child data and compute layout
  // ---------------------------------------------------------------------------

  const childItems = useMemo(() => extractChildren(children), [children]);

  const layoutKey = useMemo(
    () => buildLayoutKey(childItems, gap, minScale, seed),
    [childItems, gap, minScale, seed],
  );

  const layout: LayoutResult | null = useMemo(() => {
    if (containerWidth === 0 || childItems.length === 0) return null;

    const availableWidth = containerWidth - padding * 2;
    return computeLayout(
      childItems.map((c) => c.imageData),
      {
        gap,
        minScale,
        padding: 0,
        seed: effectiveSeed,
        containerWidth: availableWidth,
        containerHeight: availableWidth,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, containerWidth]);

  // ---------------------------------------------------------------------------
  // Compute rendered positions (normalized + centered)
  // ---------------------------------------------------------------------------

  const availableWidth = containerWidth - padding * 2;
  const layoutWidth = layout ? layout.bounds.width : 0;
  const layoutHeight = layout ? layout.bounds.height : 0;
  const fitScale = layoutWidth > availableWidth ? availableWidth / layoutWidth : 1;
  const scaledLayoutHeight = layoutHeight * fitScale;
  const scaledLayoutWidth = layoutWidth * fitScale;
  const horizontalOffset = (availableWidth - scaledLayoutWidth) / 2;
  const containerHeight = layout ? scaledLayoutHeight + padding * 2 : 0;

  // Build a map of key → rendered position for the current layout
  const currentSnapshots = useMemo(() => {
    const map = new Map<string, FrameSnapshot>();
    if (!layout) return map;

    childItems.forEach((child, index) => {
      const frame = layout.frames[index];
      if (!frame) return;
      map.set(child.key, {
        left: frame.x - layout.bounds.minX,
        top: frame.y - layout.bounds.minY,
        width: frame.width,
        height: frame.height,
      });
    });
    return map;
  }, [layout, childItems]);

  // ---------------------------------------------------------------------------
  // FLIP animation
  // ---------------------------------------------------------------------------

  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useLayoutEffect(() => {
    const shouldAnimate = animate && !prefersReducedMotion.current && !isFirstRenderRef.current;
    isFirstRenderRef.current = false;

    if (!shouldAnimate || !layout) {
      // Still update snapshots even if not animating
      prevSnapshotsRef.current = new Map(currentSnapshots);
      prevKeysRef.current = new Set(childItems.map((c) => c.key));
      return;
    }

    const inner = innerRef.current;
    if (!inner) return;

    const frameEls = inner.querySelectorAll<HTMLElement>('[data-pendu-key]');
    const currentKeys = new Set(childItems.map((c) => c.key));
    const prevKeys = prevKeysRef.current;
    const prevSnapshots = prevSnapshotsRef.current;
    const easing = `cubic-bezier(0.25, 0.1, 0.25, 1)`;

    frameEls.forEach((el) => {
      const key = el.dataset.penduKey;
      if (!key) return;

      const curr = currentSnapshots.get(key);
      if (!curr) return;

      const prev = prevSnapshots.get(key);

      if (!prev || !prevKeys.has(key)) {
        // ENTER — new frame, scale and fade in
        el.style.transition = 'none';
        el.style.transform = 'scale(0.7)';
        el.style.opacity = '0';

        // Force style recalc before adding transition
        void el.offsetHeight;

        el.style.transition = `transform ${animationDuration}ms ${easing}, opacity ${animationDuration}ms ${easing}`;
        el.style.transform = 'scale(1)';
        el.style.opacity = '1';

        // Clean up inline styles after animation
        const cleanup = () => {
          el.style.removeProperty('transition');
          el.style.removeProperty('transform');
          el.style.removeProperty('opacity');
          el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup, { once: true });
        return;
      }

      // MOVE — animate from old position to new
      const dx = prev.left - curr.left;
      const dy = prev.top - curr.top;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      // Apply inverse transform (FLIP: Invert)
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      // Force style recalc
      void el.offsetHeight;

      // Animate to final position (FLIP: Play)
      el.style.transition = `transform ${animationDuration}ms ${easing}`;
      el.style.transform = 'translate(0, 0)';

      const cleanup = () => {
        el.style.removeProperty('transition');
        el.style.removeProperty('transform');
        el.removeEventListener('transitionend', cleanup);
      };
      el.addEventListener('transitionend', cleanup, { once: true });
    });

    // EXIT — animate removed frames
    // For each key that was in prevKeys but not in currentKeys, create a ghost element
    prevKeys.forEach((key) => {
      if (currentKeys.has(key)) return;

      const prev = prevSnapshots.get(key);
      if (!prev || !inner) return;

      // Create a ghost element at the old position
      const ghost = document.createElement('div');
      ghost.className = 'pendu-frame pendu-frame--exiting';
      ghost.style.position = 'absolute';
      ghost.style.left = `${prev.left}px`;
      ghost.style.top = `${prev.top}px`;
      ghost.style.width = `${prev.width}px`;
      ghost.style.height = `${prev.height}px`;
      ghost.style.background = 'var(--pendu-skeleton-bg, #e0e0e0)';
      ghost.style.borderRadius = 'var(--pendu-frame-radius, 0)';
      ghost.style.boxShadow = 'var(--pendu-frame-shadow, none)';
      ghost.style.overflow = 'hidden';
      ghost.style.pointerEvents = 'none';
      ghost.style.transition = 'none';
      ghost.style.opacity = '1';
      ghost.style.transform = 'scale(1)';

      inner.appendChild(ghost);

      // Force recalc
      void ghost.offsetHeight;

      ghost.style.transition = `transform ${animationDuration}ms ${easing}, opacity ${animationDuration}ms ${easing}`;
      ghost.style.transform = 'scale(0.7)';
      ghost.style.opacity = '0';

      ghost.addEventListener('transitionend', () => {
        ghost.remove();
      }, { once: true });

      // Safety cleanup in case transitionend doesn't fire
      setTimeout(() => ghost.remove(), animationDuration + 50);
    });

    // Update refs for next render
    prevSnapshotsRef.current = new Map(currentSnapshots);
    prevKeysRef.current = currentKeys;
  }, [layout, animate, animationDuration, childItems, currentSnapshots]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const rootStyle: React.CSSProperties = {
    ...CSS_VAR_DEFAULTS,
    '--pendu-gap': `${gap}px`,
    '--pendu-padding': `${padding}px`,
    '--pendu-transition-duration': `${animationDuration}ms`,
    position: 'relative' as const,
    width: '100%',
    height: containerHeight > 0 ? containerHeight : 'auto',
    background: 'var(--pendu-bg)',
    overflow: 'hidden' as const,
    ...style,
  } as React.CSSProperties;

  const innerStyle: React.CSSProperties = {
    position: 'absolute' as const,
    left: padding + horizontalOffset,
    top: padding,
    width: layoutWidth,
    height: layoutHeight,
    transform: fitScale < 1 ? `scale3d(${fitScale}, ${fitScale}, 1)` : undefined,
    transformOrigin: 'top left',
  };

  return (
    <div
      ref={containerRef}
      className={['pendu', className].filter(Boolean).join(' ')}
      style={rootStyle}
    >
      {layout && (
        <div ref={innerRef} style={innerStyle}>
          {childItems.map((child, index) => {
            const frame = layout.frames[index];
            if (!frame) return null;

            const frameStyle: React.CSSProperties = {
              position: 'absolute',
              left: frame.x - layout.bounds.minX,
              top: frame.y - layout.bounds.minY,
              width: frame.width,
              height: frame.height,
            };

            return (
              <PenduImage
                key={child.key}
                {...child.props}
                _frameStyle={frameStyle}
                _penduKey={child.key}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compound component export
// ---------------------------------------------------------------------------

type PenduType = typeof PenduComponent & {
  Image: typeof PenduImage;
};

const Pendu = PenduComponent as PenduType;
Pendu.Image = PenduImage;

export { Pendu };
