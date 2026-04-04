import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { PenduImage } from '../PenduImage';

describe('PenduImage', () => {
  it('renders an img element with correct src and alt', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} alt="Test photo" />,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/photo.jpg');
    expect(img.getAttribute('alt')).toBe('Test photo');
  });

  it('renders with empty alt when not provided', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} />,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('');
  });

  it('applies pendu-frame class to wrapper', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} />,
    );
    expect(container.querySelector('.pendu-frame')).toBeTruthy();
  });

  it('merges consumer className with pendu-frame', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} className="featured" />,
    );
    const frame = container.querySelector('.pendu-frame');
    expect(frame?.classList.contains('featured')).toBe(true);
  });

  it('merges consumer style with _frameStyle', () => {
    const { container } = render(
      <PenduImage
        src="/photo.jpg"
        width={800}
        height={600}
        _frameStyle={{ position: 'absolute', left: 10, top: 20, width: 100, height: 80 }}
        style={{ border: '1px solid red' }}
      />,
    );
    const frame = container.querySelector('.pendu-frame') as HTMLElement;
    expect(frame.style.left).toBe('10px');
    expect(frame.style.border).toBe('1px solid red');
  });

  it('fires onClick callback', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} onClick={handleClick} />,
    );
    const frame = container.querySelector('.pendu-frame')!;
    fireEvent.click(frame);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows skeleton before image loads', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} />,
    );
    expect(container.querySelector('.pendu-skeleton')).toBeTruthy();
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.style.opacity).toBe('0');
  });

  it('hides skeleton after image loads', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} />,
    );
    const img = container.querySelector('img')!;
    fireEvent.load(img);
    expect(container.querySelector('.pendu-skeleton')).toBeFalsy();
    expect((img as HTMLImageElement).style.opacity).toBe('1');
  });

  it('sets loading attribute when provided', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} loading="lazy" />,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('does not set loading attribute by default', () => {
    const { container } = render(
      <PenduImage src="/photo.jpg" width={800} height={600} />,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBeNull();
  });

  it('has displayName Pendu.Image', () => {
    expect(PenduImage.displayName).toBe('Pendu.Image');
  });
});
