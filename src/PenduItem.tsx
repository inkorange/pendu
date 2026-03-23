'use client';

import React, { memo } from 'react';

export interface PenduItemProps {
  width: number;
  height: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  /** @internal Injected by <Pendu> parent — consumers should not set this */
  _frameStyle?: React.CSSProperties;
  /** @internal Injected by <Pendu> parent — used for FLIP animation tracking */
  _penduKey?: string;
}

const PenduItem = memo(function PenduItem({
  children,
  className,
  style,
  onClick,
  _frameStyle,
  _penduKey,
}: PenduItemProps) {
  return (
    <div
      className={['pendu-frame', 'pendu-item', className].filter(Boolean).join(' ')}
      style={{
        ..._frameStyle,
        overflow: 'hidden',
        ...style,
      }}
      onClick={onClick}
      data-pendu-key={_penduKey}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
});

PenduItem.displayName = 'Pendu.Item';

export { PenduItem };
