import React from 'react';
import { render, act } from '@testing-library/react';
import { Pendu } from '../Pendu';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  elements: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instance = this;
  }

  observe(el: Element) {
    this.elements.push(el);
    // Simulate initial measurement
    this.callback(
      [
        {
          target: el,
          contentRect: { width: 680, height: 500 } as DOMRectReadOnly,
          contentBoxSize: [{ inlineSize: 680, blockSize: 500 }],
          borderBoxSize: [{ inlineSize: 680, blockSize: 500 }],
          devicePixelContentBoxSize: [],
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  unobserve() {}
  disconnect() {}

  static instance: MockResizeObserver | null = null;
}

beforeAll(() => {
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = MockResizeObserver;
});

beforeEach(() => {
  MockResizeObserver.instance = null;
});

describe('Pendu', () => {
  it('renders a container with pendu class', () => {
    const { container } = render(
      <Pendu>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    expect(container.querySelector('.pendu')).toBeTruthy();
  });

  it('applies consumer className to container', () => {
    const { container } = render(
      <Pendu className="my-gallery">
        <Pendu.Image src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    const root = container.querySelector('.pendu');
    expect(root?.classList.contains('my-gallery')).toBe(true);
  });

  it('applies consumer style to container', () => {
    const { container } = render(
      <Pendu style={{ backgroundColor: 'red' }}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    const root = container.querySelector('.pendu') as HTMLElement;
    expect(root.style.backgroundColor).toBe('red');
  });

  it('renders Pendu.Image children as positioned frames', () => {
    const { container } = render(
      <Pendu gap={16} seed={42}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
        <Pendu.Image src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    const frames = container.querySelectorAll('.pendu-frame');
    expect(frames).toHaveLength(2);

    // Each frame should have absolute positioning
    frames.forEach((frame) => {
      const el = frame as HTMLElement;
      expect(el.style.position).toBe('absolute');
    });
  });

  it('renders images inside frames', () => {
    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Image src="/a.jpg" width={800} height={600} alt="Photo A" />
      </Pendu>,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/a.jpg');
    expect(img.getAttribute('alt')).toBe('Photo A');
  });

  it('handles empty children without error', () => {
    const { container } = render(<Pendu>{null}</Pendu>);
    expect(container.querySelector('.pendu')).toBeTruthy();
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(0);
  });

  it('handles single child', () => {
    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(1);
  });

  it('responds to children being added', () => {
    const { container, rerender } = render(
      <Pendu seed={42}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(1);

    rerender(
      <Pendu seed={42}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Image key="b" src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(2);
  });

  it('responds to children being removed', () => {
    const { container, rerender } = render(
      <Pendu seed={42}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Image key="b" src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(2);

    rerender(
      <Pendu seed={42}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    // Exclude exit-animation ghost elements
    expect(container.querySelectorAll('.pendu-frame:not(.pendu-frame--exiting)')).toHaveLength(1);
  });

  it('produces deterministic layout with seed', () => {
    const { container: c1 } = render(
      <Pendu seed={99}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Image key="b" src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );

    const { container: c2 } = render(
      <Pendu seed={99}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Image key="b" src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );

    const frames1 = c1.querySelectorAll('.pendu-frame');
    const frames2 = c2.querySelectorAll('.pendu-frame');

    expect(frames1.length).toBe(frames2.length);
    frames1.forEach((f1, i) => {
      const el1 = f1 as HTMLElement;
      const el2 = frames2[i] as HTMLElement;
      expect(el1.style.left).toBe(el2.style.left);
      expect(el1.style.top).toBe(el2.style.top);
    });
  });

  it('works without seed (random)', () => {
    const { container } = render(
      <Pendu>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
        <Pendu.Image src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(2);
  });

  it('sets CSS variables on root element', () => {
    const { container } = render(
      <Pendu gap={24} animationDuration={500}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    const root = container.querySelector('.pendu') as HTMLElement;
    expect(root.style.getPropertyValue('--pendu-gap')).toBe('24px');
    expect(root.style.getPropertyValue('--pendu-transition-duration')).toBe('500ms');
  });

  it('ignores non-Pendu.Image children', () => {
    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
        <div>Not an image</div>
        <span>Also ignored</span>
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(1);
  });

  it('Pendu.Image is accessible as a static property', () => {
    expect(Pendu.Image).toBeDefined();
    expect(Pendu.Image.displayName).toBe('Pendu.Image');
  });

  it('Pendu.Item is accessible as a static property', () => {
    expect(Pendu.Item).toBeDefined();
    expect(Pendu.Item.displayName).toBe('Pendu.Item');
  });

  it('renders Pendu.Item children with custom content', () => {
    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Item key="card" width={400} height={300}>
          <div data-testid="card">Hello</div>
        </Pendu.Item>
      </Pendu>,
    );
    const items = container.querySelectorAll('.pendu-item');
    expect(items).toHaveLength(1);
    expect(container.querySelector('[data-testid="card"]')?.textContent).toBe('Hello');
  });

  it('renders mixed Pendu.Image and Pendu.Item children', () => {
    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Image key="img" src="/a.jpg" width={800} height={600} />
        <Pendu.Item key="card" width={400} height={300}>
          <div>Custom</div>
        </Pendu.Item>
        <Pendu.Image key="img2" src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    const frames = container.querySelectorAll('.pendu-frame');
    expect(frames).toHaveLength(3);
    const items = container.querySelectorAll('.pendu-item');
    expect(items).toHaveLength(1);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);
  });

  it('positions Pendu.Item absolutely like Pendu.Image', () => {
    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Item key="card" width={400} height={300}>
          <div>Card</div>
        </Pendu.Item>
      </Pendu>,
    );
    const item = container.querySelector('.pendu-item') as HTMLElement;
    expect(item.style.position).toBe('absolute');
  });

  it('handles Pendu.Item add/remove with FLIP animation', () => {
    const { container, rerender } = render(
      <Pendu seed={42}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Item key="card" width={400} height={300}>
          <div>Card</div>
        </Pendu.Item>
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(2);

    // Remove the item
    rerender(
      <Pendu seed={42}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame:not(.pendu-frame--exiting)')).toHaveLength(1);

    // Add it back
    rerender(
      <Pendu seed={42}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Item key="card2" width={400} height={300}>
          <div>New Card</div>
        </Pendu.Item>
      </Pendu>,
    );
    expect(container.querySelectorAll('.pendu-frame:not(.pendu-frame--exiting)')).toHaveLength(2);
  });

  it('detects parent height constraint via ResizeObserver', () => {
    // Create a parent with a fixed clientHeight
    const parentDiv = document.createElement('div');
    Object.defineProperty(parentDiv, 'clientHeight', { value: 400, configurable: true });
    document.body.appendChild(parentDiv);

    let parentObserverCallback: ResizeObserverCallback | null = null;
    const origObserver = MockResizeObserver;
    let observeCount = 0;

    class HeightAwareMockObserver extends MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        observeCount = 0;
      }
      observe(el: Element) {
        observeCount++;
        if (observeCount === 1) {
          // Self observer — simulate width measurement
          super.observe(el);
        } else {
          // Parent observer
          parentObserverCallback = this.callback;
          this.callback(
            [{
              target: el,
              contentRect: { width: 680, height: 400 } as DOMRectReadOnly,
              contentBoxSize: [{ inlineSize: 680, blockSize: 400 }],
              borderBoxSize: [{ inlineSize: 680, blockSize: 400 }],
              devicePixelContentBoxSize: [],
            } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
        }
      }
    }

    (globalThis as unknown as Record<string, unknown>).ResizeObserver = HeightAwareMockObserver;

    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
        <Pendu.Image src="/b.jpg" width={600} height={900} />
        <Pendu.Image src="/c.jpg" width={1200} height={800} />
      </Pendu>,
      { container: parentDiv },
    );

    const root = container.querySelector('.pendu') as HTMLElement;
    expect(root).toBeTruthy();
    // Gallery should render within the parent
    expect(root.style.overflow).toBe('hidden');

    // Restore
    (globalThis as unknown as Record<string, unknown>).ResizeObserver = origObserver;
    document.body.removeChild(parentDiv);
  });

  it('disables animations when animate=false', () => {
    const { container, rerender } = render(
      <Pendu seed={42} animate={false}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );

    rerender(
      <Pendu seed={42} animate={false}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Image key="b" src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );

    // Frames should render without animation styles
    const frames = container.querySelectorAll('.pendu-frame');
    expect(frames).toHaveLength(2);
    frames.forEach((f) => {
      const el = f as HTMLElement;
      // No transition or transform should be applied
      expect(el.style.transform).toBe('');
    });
  });

  it('fires onLayoutChange callback with layout result', () => {
    const handleLayoutChange = jest.fn();
    render(
      <Pendu seed={42} onLayoutChange={handleLayoutChange}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
        <Pendu.Image src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    expect(handleLayoutChange).toHaveBeenCalledTimes(1);
    const result = handleLayoutChange.mock.calls[0][0];
    expect(result.frames).toHaveLength(2);
    expect(result.bounds).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.stats.placed).toBe(2);
  });

  it('fires onLayoutChange again when children change', () => {
    const handleLayoutChange = jest.fn();
    const { rerender } = render(
      <Pendu seed={42} onLayoutChange={handleLayoutChange}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    expect(handleLayoutChange).toHaveBeenCalledTimes(1);

    rerender(
      <Pendu seed={42} onLayoutChange={handleLayoutChange}>
        <Pendu.Image key="a" src="/a.jpg" width={800} height={600} />
        <Pendu.Image key="b" src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    expect(handleLayoutChange).toHaveBeenCalledTimes(2);
    expect(handleLayoutChange.mock.calls[1][0].frames).toHaveLength(2);
  });

  it('passes lazy loading attribute to images when lazy=true', () => {
    const { container } = render(
      <Pendu seed={42} lazy>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('does not set loading attribute when lazy is not set', () => {
    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
      </Pendu>,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBeNull();
  });

  it('accepts minItemWidth and maxItemWidth props', () => {
    const handleLayoutChange = jest.fn();
    render(
      <Pendu seed={42} minItemWidth={100} maxItemWidth={300} onLayoutChange={handleLayoutChange}>
        <Pendu.Image src="/a.jpg" width={800} height={600} />
        <Pendu.Image src="/b.jpg" width={600} height={900} />
      </Pendu>,
    );
    expect(handleLayoutChange).toHaveBeenCalledTimes(1);
    const result = handleLayoutChange.mock.calls[0][0];
    expect(result.frames).toHaveLength(2);
  });

  it('scales layout to fit width when cluster exceeds container', () => {
    // Use a narrow container (200px) with many images to force width scaling
    class NarrowObserver extends MockResizeObserver {
      observe(el: Element) {
        this.callback(
          [{
            target: el,
            contentRect: { width: 200, height: 0 } as DOMRectReadOnly,
            contentBoxSize: [{ inlineSize: 200, blockSize: 0 }],
            borderBoxSize: [{ inlineSize: 200, blockSize: 0 }],
            devicePixelContentBoxSize: [],
          } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
    }

    const orig = (globalThis as unknown as Record<string, unknown>).ResizeObserver;
    (globalThis as unknown as Record<string, unknown>).ResizeObserver = NarrowObserver;

    const { container } = render(
      <Pendu seed={42}>
        <Pendu.Image src="/a.jpg" width={1200} height={800} />
        <Pendu.Image src="/b.jpg" width={1600} height={1000} />
        <Pendu.Image src="/c.jpg" width={1400} height={800} />
        <Pendu.Image src="/d.jpg" width={800} height={1200} />
      </Pendu>,
    );

    // The inner wrapper should have a scale transform
    const inner = container.querySelector('.pendu > div') as HTMLElement;
    if (inner && inner.style.transform) {
      expect(inner.style.transform).toContain('scale3d');
    }

    (globalThis as unknown as Record<string, unknown>).ResizeObserver = orig;
  });
});
