'use client';

import React, { useState, memo } from 'react';

export interface PenduImageProps {
  src: string;
  width: number;
  height: number;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  /** @internal Injected by <Pendu> parent — consumers should not set this */
  _frameStyle?: React.CSSProperties;
}

const PenduImage = memo(function PenduImage({
  src,
  alt = '',
  className,
  style,
  onClick,
  _frameStyle,
}: PenduImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={['pendu-frame', className].filter(Boolean).join(' ')}
      style={{ ..._frameStyle, ...style }}
      onClick={onClick}
    >
      {!loaded && (
        <div
          className="pendu-skeleton"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'var(--pendu-skeleton-bg, #e0e0e0)',
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity var(--pendu-transition-duration, 300ms) var(--pendu-transition-easing, ease-out)',
        }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
});

PenduImage.displayName = 'Pendu.Image';

export { PenduImage };
