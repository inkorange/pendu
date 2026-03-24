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
import { PenduItem } from './PenduItem';
import type { PenduImageData, LayoutResult } from './types';
import type { PenduImageProps } from './PenduImage';
import type { PenduItemProps } from './PenduItem';

// ---------------------------------------------------------------------------
// CSS variable defaults
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

export type PenduAnimationStyle = 'scale' | 'slide' | 'fade';

export interface PenduProps {
  gap?: number;
  minScale?: number;
  padding?: number;
  seed?: number;
  animate?: boolean;
  animationDuration?: number;
  animationStyle?: PenduAnimationStyle;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

interface ChildImageData {
  key: string;
  type: 'image' | 'item';
  props: PenduImageProps | PenduItemProps;
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

    const key = child.key != null ? String(child.key) : String(index);

    if (child.type === PenduImage) {
      const props = child.props as PenduImageProps;
      result.push({
        key,
        type: 'image',
        props,
        imageData: { width: props.width, height: props.height },
      });
    } else if (child.type === PenduItem) {
      const props = child.props as PenduItemProps;
      result.push({
        key,
        type: 'item',
        props,
        imageData: { width: props.width, height: props.height },
      });
    }
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
  animationStyle = 'scale',
  className,
  style,
  children,
}: PenduProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef<number>(seed ?? Math.floor(Math.random() * 0x100000000));

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [maxHeight, setMaxHeight] = useState<number>(0); // 0 = unconstrained

  // FLIP animation state
  const prevSnapshotsRef = useRef<Map<string, FrameSnapshot>>(new Map());
  const prevKeysRef = useRef<Set<string>>(new Set());
  const prevElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const isFirstRenderRef = useRef(true);

  const effectiveSeed = seed ?? seedRef.current;

  // ---------------------------------------------------------------------------
  // Measure container width + detect height constraint from parent
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const parentEl = el.parentElement;

    // Observe Pendu element for width
    const selfObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(Math.round(w));
      }
    });
    selfObserver.observe(el);

    // Observe parent for height constraints
    // We temporarily set Pendu to height:0 to measure what height the parent
    // *actually* gives us — if it's > 0, the parent has a fixed height.
    // But that's destructive. Instead, we check if the parent's height is
    // independent of our content by comparing parent height when we have
    // min-height:0 vs our computed height.
    //
    // Simpler approach: just read the parent's height. If the parent has
    // overflow:hidden or an explicit height that doesn't change with our
    // content, use it as a max constraint.
    let parentObserver: ResizeObserver | null = null;
    if (parentEl) {
      parentObserver = new ResizeObserver(() => {
        // Read the parent's available height
        const ph = parentEl.clientHeight;

        // Check if parent constrains height:
        // - Has overflow hidden/scroll/auto, OR
        // - Has an explicit CSS height (inline style, or resolved from class)
        //
        // We detect this by temporarily making ourselves 0-height and seeing
        // if the parent keeps its size (= constrained) or also goes to 0 (= auto)
        const prevMinH = el.style.minHeight;
        const prevH = el.style.height;
        el.style.minHeight = '0';
        el.style.height = '0';
        const parentHeightWhenEmpty = parentEl.clientHeight;
        el.style.minHeight = prevMinH;
        el.style.height = prevH;

        if (parentHeightWhenEmpty > 0) {
          // Parent has a fixed height independent of our content
          setMaxHeight(parentHeightWhenEmpty);
        } else {
          setMaxHeight(0); // unconstrained
        }
      });
      parentObserver.observe(parentEl);
    }

    return () => {
      selfObserver.disconnect();
      parentObserver?.disconnect();
    };
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
    // Use actual height constraint when available. When unconstrained,
    // use a shorter height hint (60% of width) to encourage the layout
    // to spread horizontally rather than stacking tall.
    const availableHeight = maxHeight > 0
      ? maxHeight - padding * 2
      : Math.round(availableWidth * 0.6);

    return computeLayout(
      childItems.map((c) => c.imageData),
      {
        gap,
        minScale,
        padding: 0,
        seed: effectiveSeed,
        containerWidth: availableWidth,
        containerHeight: availableHeight,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, containerWidth, maxHeight]);

  // ---------------------------------------------------------------------------
  // Compute fit scale (both axes)
  // ---------------------------------------------------------------------------

  const availableWidth = containerWidth - padding * 2;
  const layoutWidth = layout ? layout.bounds.width : 0;
  const layoutHeight = layout ? layout.bounds.height : 0;

  let fitScale = 1;

  // Scale to fit width
  if (layoutWidth > availableWidth && availableWidth > 0) {
    fitScale = availableWidth / layoutWidth;
  }

  // Scale to fit height (if constrained)
  if (maxHeight > 0 && layoutHeight > 0) {
    const availableHeight = maxHeight - padding * 2;
    if (availableHeight > 0 && layoutHeight * fitScale > availableHeight) {
      fitScale = Math.min(fitScale, availableHeight / layoutHeight);
    }
  }

  const scaledLayoutWidth = layoutWidth * fitScale;
  const scaledLayoutHeight = layoutHeight * fitScale;
  const horizontalOffset = (availableWidth - scaledLayoutWidth) / 2;
  const verticalOffset = maxHeight > 0
    ? ((maxHeight - padding * 2) - scaledLayoutHeight) / 2
    : 0;

  // Auto height when unconstrained; fill parent when constrained
  const outputHeight = layout
    ? (maxHeight > 0 ? maxHeight : scaledLayoutHeight + padding * 2)
    : (maxHeight > 0 ? maxHeight : 'auto');

  // ---------------------------------------------------------------------------
  // Build snapshot map for FLIP
  // ---------------------------------------------------------------------------

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
    const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

    // Compute slide direction for an element based on its position relative to the container center
    const getSlideTransform = (left: number, top: number, width: number, height: number): string => {
      const containerW = innerRef.current?.offsetWidth ?? 1;
      const containerH = innerRef.current?.offsetHeight ?? 1;
      const cx = (left + width / 2) / containerW;
      const cy = (top + height / 2) / containerH;
      const dx = cx - 0.5;
      const dy = cy - 0.5;

      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? `translateX(${width}px)` : `translateX(-${width}px)`;
      }
      return dy > 0 ? `translateY(${height}px)` : `translateY(-${height}px)`;
    };

    frameEls.forEach((el) => {
      const key = el.dataset.penduKey;
      if (!key) return;

      const curr = currentSnapshots.get(key);
      if (!curr) return;

      const prev = prevSnapshots.get(key);

      if (!prev || !prevKeys.has(key)) {
        // ENTER
        el.style.transition = 'none';
        if (animationStyle === 'slide') {
          el.style.transform = getSlideTransform(curr.left, curr.top, curr.width, curr.height);
          el.style.opacity = '0';
        } else if (animationStyle === 'fade') {
          el.style.transform = '';
          el.style.opacity = '0';
        } else {
          el.style.transform = 'scale(0.7)';
          el.style.opacity = '0';
        }
        void el.offsetHeight;
        el.style.transition = `transform ${animationDuration}ms ${easing}, opacity ${animationDuration}ms ${easing}`;
        el.style.transform = animationStyle === 'fade' ? '' : 'scale(1) translate(0, 0)';
        el.style.opacity = '1';
        const cleanup = () => { el.style.removeProperty('transition'); el.style.removeProperty('transform'); el.style.removeProperty('opacity'); el.removeEventListener('transitionend', cleanup); };
        el.addEventListener('transitionend', cleanup, { once: true });
        return;
      }

      // MOVE
      const dx = prev.left - curr.left;
      const dy = prev.top - curr.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetHeight;
      el.style.transition = `transform ${animationDuration}ms ${easing}`;
      el.style.transform = 'translate(0, 0)';
      const cleanup = () => { el.style.removeProperty('transition'); el.style.removeProperty('transform'); el.removeEventListener('transitionend', cleanup); };
      el.addEventListener('transitionend', cleanup, { once: true });
    });

    // EXIT — clone previous elements for removed frames
    prevKeys.forEach((key) => {
      if (currentKeys.has(key)) return;
      const prev = prevSnapshots.get(key);
      if (!prev || !inner) return;

      // Try to use the cached clone of the actual element
      const cachedEl = prevElementsRef.current.get(key);
      const ghost = cachedEl ? cachedEl.cloneNode(true) as HTMLElement : document.createElement('div');

      ghost.className = (ghost.className || '') + ' pendu-frame--exiting';
      ghost.style.position = 'absolute';
      ghost.style.left = `${prev.left}px`;
      ghost.style.top = `${prev.top}px`;
      ghost.style.width = `${prev.width}px`;
      ghost.style.height = `${prev.height}px`;
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '1';
      ghost.style.transition = 'none';
      ghost.style.overflow = 'hidden';

      if (!cachedEl) {
        ghost.style.background = 'var(--pendu-skeleton-bg, #e0e0e0)';
        ghost.style.borderRadius = 'var(--pendu-frame-radius, 0)';
      }

      inner.appendChild(ghost);
      void ghost.offsetHeight;
      ghost.style.transition = `transform ${animationDuration}ms ${easing}, opacity ${animationDuration}ms ${easing}`;
      if (animationStyle === 'slide') {
        ghost.style.transform = getSlideTransform(prev.left, prev.top, prev.width, prev.height);
      } else if (animationStyle === 'fade') {
        // no transform, just fade
      } else {
        ghost.style.transform = 'scale(0.7)';
      }
      ghost.style.opacity = '0';
      ghost.addEventListener('transitionend', () => ghost.remove(), { once: true });
      setTimeout(() => ghost.remove(), animationDuration + 50);
    });

    // Cache current frame elements for next exit animation
    const elementMap = new Map<string, HTMLElement>();
    frameEls.forEach((el) => {
      const key = el.dataset.penduKey;
      if (key) elementMap.set(key, el);
    });
    prevElementsRef.current = elementMap;

    prevSnapshotsRef.current = new Map(currentSnapshots);
    prevKeysRef.current = currentKeys;
  }, [layout, animate, animationDuration, animationStyle, childItems, currentSnapshots]);

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
    height: outputHeight,
    background: 'var(--pendu-bg)',
    overflow: 'hidden' as const,
    ...style,
  } as React.CSSProperties;

  const innerStyle: React.CSSProperties = {
    position: 'absolute' as const,
    left: padding + horizontalOffset,
    top: padding + verticalOffset,
    width: layoutWidth,
    height: layoutHeight,
    transition: animate ? `transform ${animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1)` : undefined,
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

            if (child.type === 'item') {
              return (
                <PenduItem
                  key={child.key}
                  {...(child.props as PenduItemProps)}
                  _frameStyle={frameStyle}
                  _penduKey={child.key}
                />
              );
            }

            return (
              <PenduImage
                key={child.key}
                {...(child.props as PenduImageProps)}
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
  Item: typeof PenduItem;
};

const Pendu = PenduComponent as PenduType;
Pendu.Image = PenduImage;
Pendu.Item = PenduItem;

export { Pendu };
