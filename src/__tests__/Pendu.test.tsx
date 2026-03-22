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
    expect(container.querySelectorAll('.pendu-frame')).toHaveLength(1);
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
});
