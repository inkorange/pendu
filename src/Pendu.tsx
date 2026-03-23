'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from 'react';
import { computeLayout } from './layout';
import { PenduImage } from './PenduImage';
import type { PenduImageData, LayoutResult, PlacedFrame } from './types';
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChildImageData {
  key: string;
  props: PenduImageProps;
  imageData: PenduImageData;
}

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
  const seedRef = useRef<number>(seed ?? Math.floor(Math.random() * 0x100000000));
  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // If consumer provides a seed, use it; otherwise keep the stable random seed
  const effectiveSeed = seed ?? seedRef.current;

  // ---------------------------------------------------------------------------
  // ResizeObserver for responsive width
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

    // Layout computes against the available width inside padding
    const availableWidth = containerWidth - padding * 2;
    return computeLayout(
      childItems.map((c) => c.imageData),
      {
        gap,
        minScale,
        padding: 0, // padding is handled by the component, not the algorithm
        seed: effectiveSeed,
        containerWidth: availableWidth,
        containerHeight: availableWidth, // square initial, height auto-computed
      },
    );
    // layoutKey captures all dependencies in a stable string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, containerWidth]);

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
    if (!animate || !layout || prefersReducedMotion.current) return;

    const el = containerRef.current;
    if (!el) return;

    const frames = el.querySelectorAll<HTMLElement>('.pendu-frame');
    frames.forEach((frameEl) => {
      const key = frameEl.dataset.penduKey;
      if (!key) return;

      const prev = prevPositionsRef.current.get(key);
      if (!prev) {
        // Entering frame — scale in
        frameEl.style.transform = 'scale(0.8)';
        frameEl.style.opacity = '0';
        requestAnimationFrame(() => {
          frameEl.style.transition = `transform ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out`;
          frameEl.style.transform = 'scale(1)';
          frameEl.style.opacity = '1';
        });
        return;
      }

      // Moving frame — translate from old position
      const currentX = parseFloat(frameEl.style.left) || 0;
      const currentY = parseFloat(frameEl.style.top) || 0;
      const dx = prev.x - currentX;
      const dy = prev.y - currentY;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      frameEl.style.transform = `translate(${dx}px, ${dy}px)`;
      frameEl.style.transition = 'none';

      requestAnimationFrame(() => {
        frameEl.style.transition = `transform ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out`;
        frameEl.style.transform = 'translate(0, 0)';
      });
    });

    // Store current positions for next FLIP
    const nextPositions = new Map<string, { x: number; y: number }>();
    if (layout) {
      childItems.forEach((child, i) => {
        if (layout.frames[i]) {
          nextPositions.set(child.key, {
            x: layout.frames[i].x,
            y: layout.frames[i].y,
          });
        }
      });
    }
    prevPositionsRef.current = nextPositions;
  }, [layout, animate, animationDuration, childItems]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const availableWidth = containerWidth - padding * 2;
  const layoutWidth = layout ? layout.bounds.width : 0;
  const layoutHeight = layout ? layout.bounds.height : 0;

  // Scale the entire layout to fit within the container if it overflows
  const fitScale = layoutWidth > availableWidth ? availableWidth / layoutWidth : 1;
  const scaledLayoutWidth = layoutWidth * fitScale;
  const scaledLayoutHeight = layoutHeight * fitScale;
  const horizontalOffset = (availableWidth - scaledLayoutWidth) / 2;
  const containerHeight = layout ? scaledLayoutHeight + padding * 2 : 0;

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

  // Inner wrapper uses scale3d for GPU-accelerated fitting
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
        <div style={innerStyle}>
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

            return React.cloneElement(
              <PenduImage
                key={child.key}
                {...child.props}
                _frameStyle={frameStyle}
              />,
              { 'data-pendu-key': child.key } as Record<string, string>,
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
