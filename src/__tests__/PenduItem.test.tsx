import React from 'react';
import { render, screen } from '@testing-library/react';
import { PenduItem } from '../PenduItem';

describe('PenduItem', () => {
  it('renders children content', () => {
    render(
      <PenduItem width={400} height={300} _frameStyle={{ position: 'absolute', left: 0, top: 0, width: 400, height: 300 }} _penduKey="test-1">
        <div data-testid="custom-content">Hello</div>
      </PenduItem>
    );
    const el = screen.getByTestId('custom-content');
    expect(el).toBeTruthy();
    expect(el.textContent).toBe('Hello');
  });

  it('applies pendu-frame and pendu-item classes', () => {
    const { container } = render(
      <PenduItem width={400} height={300} _frameStyle={{}} _penduKey="test-2">
        <span>Content</span>
      </PenduItem>
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.classList.contains('pendu-frame')).toBe(true);
    expect(frame.classList.contains('pendu-item')).toBe(true);
  });

  it('applies custom className', () => {
    const { container } = render(
      <PenduItem width={400} height={300} className="my-card" _frameStyle={{}} _penduKey="test-3">
        <span>Content</span>
      </PenduItem>
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.classList.contains('my-card')).toBe(true);
  });

  it('sets data-pendu-key attribute', () => {
    const { container } = render(
      <PenduItem width={400} height={300} _frameStyle={{}} _penduKey="item-key">
        <span>Content</span>
      </PenduItem>
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.getAttribute('data-pendu-key')).toBe('item-key');
  });

  it('applies frame style with overflow hidden', () => {
    const frameStyle = { position: 'absolute' as const, left: 10, top: 20, width: 400, height: 300 };
    const { container } = render(
      <PenduItem width={400} height={300} _frameStyle={frameStyle} _penduKey="test-5">
        <span>Content</span>
      </PenduItem>
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.style.overflow).toBe('hidden');
    expect(frame.style.left).toBe('10px');
    expect(frame.style.top).toBe('20px');
  });

  it('handles onClick', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <PenduItem width={400} height={300} onClick={handleClick} _frameStyle={{}} _penduKey="test-6">
        <span>Clickable</span>
      </PenduItem>
    );
    (container.firstChild as HTMLElement).click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('merges custom style with frame style', () => {
    const { container } = render(
      <PenduItem width={400} height={300} style={{ border: '1px solid red' }} _frameStyle={{ position: 'absolute' as const }} _penduKey="test-7">
        <span>Styled</span>
      </PenduItem>
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.style.border).toBe('1px solid red');
    expect(frame.style.position).toBe('absolute');
  });

  it('has displayName Pendu.Item', () => {
    expect(PenduItem.displayName).toBe('Pendu.Item');
  });
});
