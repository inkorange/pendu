import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Pendu } from '../src/Pendu';

// 8 base images — duplicated with unique IDs to support up to 18
const BASE_IMAGES = [
  { src: '../resources/demo/landscape-1.jpg', width: 1200, height: 800, label: 'Landscape 1' },
  { src: '../resources/demo/landscape-2.jpg', width: 1600, height: 1000, label: 'Landscape 2' },
  { src: '../resources/demo/landscape-3.jpg', width: 1400, height: 800, label: 'Landscape 3' },
  { src: '../resources/demo/landscape-4.jpg', width: 900, height: 600, label: 'Landscape 4' },
  { src: '../resources/demo/portrait-1.jpg', width: 800, height: 1200, label: 'Portrait 1' },
  { src: '../resources/demo/portrait-2.jpg', width: 800, height: 800, label: 'Square' },
  { src: '../resources/demo/portrait-3.jpg', width: 1200, height: 1800, label: 'Portrait 3' },
  { src: '../resources/demo/portrait-4.jpg', width: 1200, height: 1600, label: 'Portrait 4' },
];

const ALL_IMAGES = Array.from({ length: 18 }, (_, i) => ({
  ...BASE_IMAGES[i % BASE_IMAGES.length],
  id: `img-${i}`,
  label: `${BASE_IMAGES[i % BASE_IMAGES.length].label}${i >= BASE_IMAGES.length ? ` (${Math.floor(i / BASE_IMAGES.length) + 1})` : ''}`,
}));

type SizeMode = 'dynamic' | 'px' | '%';

const STORAGE_KEY = 'pendu-demo-state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(state: Record<string, unknown>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function App() {
  const saved = useRef(loadState()).current;

  const [count, setCount] = useState(saved?.count ?? 5);
  const [seed, setSeed] = useState(saved?.seed ?? 42);
  const [gap, setGap] = useState(saved?.gap ?? 16);
  const [images, setImages] = useState(() => ALL_IMAGES.slice(0, saved?.count ?? 5));

  const [widthMode, setWidthMode] = useState<SizeMode>(saved?.widthMode ?? 'dynamic');
  const [widthPx, setWidthPx] = useState(saved?.widthPx ?? 600);
  const [widthPct, setWidthPct] = useState(saved?.widthPct ?? 80);
  const [heightMode, setHeightMode] = useState<SizeMode>(saved?.heightMode ?? 'dynamic');
  const [heightPx, setHeightPx] = useState(saved?.heightPx ?? 400);
  const [heightPct, setHeightPct] = useState(saved?.heightPct ?? 60);

  // Persist state on every change
  useEffect(() => {
    saveState({ count, seed, gap, widthMode, widthPx, widthPct, heightMode, heightPx, heightPct });
  }, [count, seed, gap, widthMode, widthPx, widthPct, heightMode, heightPx, heightPct]);

  const handleCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newCount = parseInt(e.target.value, 10);
    setCount(newCount);
    setImages(ALL_IMAGES.slice(0, newCount));
  }, []);

  const handleNewLayout = useCallback(() => {
    setSeed(Math.floor(Math.random() * 100000));
  }, []);

  const handleAddRandom = useCallback(() => {
    if (images.length >= ALL_IMAGES.length) return;
    const remaining = ALL_IMAGES.filter((img) => !images.find((i) => i.id === img.id));
    if (remaining.length === 0) return;
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    setImages((prev) => [...prev, random]);
    setCount((prev) => prev + 1);
  }, [images]);

  const handleRemoveLast = useCallback(() => {
    if (images.length === 0) return;
    setImages((prev) => prev.slice(0, -1));
    setCount((prev) => Math.max(0, prev - 1));
  }, [images.length]);

  // Compute container wrapper style
  const containerWrapperStyle: React.CSSProperties = {};

  if (widthMode === 'px') {
    containerWrapperStyle.width = widthPx;
    containerWrapperStyle.margin = '24px auto';
  } else if (widthMode === '%') {
    containerWrapperStyle.width = `${widthPct}%`;
    containerWrapperStyle.margin = '24px auto';
  } else {
    containerWrapperStyle.maxWidth = 900;
    containerWrapperStyle.margin = '24px auto';
    containerWrapperStyle.padding = '0 24px';
  }

  if (heightMode === 'px') {
    containerWrapperStyle.height = heightPx;
    containerWrapperStyle.overflow = 'hidden';
  } else if (heightMode === '%') {
    containerWrapperStyle.height = `${heightPct}vh`;
    containerWrapperStyle.overflow = 'hidden';
  }
  // dynamic height = no constraint (auto)

  // Display string for stats
  const widthLabel =
    widthMode === 'px' ? `${widthPx}px` :
    widthMode === '%' ? `${widthPct}%` : 'auto';
  const heightLabel =
    heightMode === 'px' ? `${heightPx}px` :
    heightMode === '%' ? `${heightPct}vh` : 'auto';

  return (
    <>
      <div className="toolbar">
        <h1>Pendu Demo</h1>

        <label>
          Count:
          <input type="range" min={0} max={18} value={count} onChange={handleCountChange} />
          <span className="count">{count}</span>
        </label>

        <label>
          Gap:
          <input type="range" min={0} max={48} value={gap} onChange={(e) => setGap(parseInt(e.target.value, 10))} />
          <span className="count">{gap}px</span>
        </label>

        <button onClick={handleNewLayout}>New Layout</button>
        <button onClick={handleAddRandom} disabled={images.length >= ALL_IMAGES.length}>+ Add</button>
        <button onClick={handleRemoveLast} disabled={images.length === 0}>- Remove</button>
      </div>

      <div className="toolbar toolbar--sizing">
        <label>
          Width:
          <select value={widthMode} onChange={(e) => setWidthMode(e.target.value as SizeMode)}>
            <option value="dynamic">Dynamic (auto)</option>
            <option value="px">Fixed (px)</option>
            <option value="%">Percentage (%)</option>
          </select>
        </label>

        {widthMode === 'px' && (
          <label>
            <input type="range" min={200} max={1200} value={widthPx} onChange={(e) => setWidthPx(parseInt(e.target.value, 10))} />
            <span className="count">{widthPx}px</span>
          </label>
        )}
        {widthMode === '%' && (
          <label>
            <input type="range" min={20} max={100} value={widthPct} onChange={(e) => setWidthPct(parseInt(e.target.value, 10))} />
            <span className="count">{widthPct}%</span>
          </label>
        )}

        <label>
          Height:
          <select value={heightMode} onChange={(e) => setHeightMode(e.target.value as SizeMode)}>
            <option value="dynamic">Dynamic (auto)</option>
            <option value="px">Fixed (px)</option>
            <option value="%">Viewport (vh)</option>
          </select>
        </label>

        {heightMode === 'px' && (
          <label>
            <input type="range" min={100} max={800} value={heightPx} onChange={(e) => setHeightPx(parseInt(e.target.value, 10))} />
            <span className="count">{heightPx}px</span>
          </label>
        )}
        {heightMode === '%' && (
          <label>
            <input type="range" min={20} max={100} value={heightPct} onChange={(e) => setHeightPct(parseInt(e.target.value, 10))} />
            <span className="count">{heightPct}vh</span>
          </label>
        )}
      </div>

      <div className="stats">
        Seed: {seed} | Images: {images.length} | Gap: {gap}px | Container: {widthLabel} × {heightLabel}
      </div>

      <div className="gallery-container" style={containerWrapperStyle}>
        <Pendu
          gap={gap}
          seed={seed}
          style={{
            '--pendu-bg': '#222',
            '--pendu-frame-radius': '4px',
            '--pendu-frame-shadow': '0 2px 8px rgba(0,0,0,0.4)',
            '--pendu-skeleton-bg': '#333',
          } as React.CSSProperties}
        >
          {images.map((img) => (
            <Pendu.Image
              key={img.id}
              src={img.src}
              width={img.width}
              height={img.height}
              alt={img.label}
            />
          ))}
        </Pendu>
      </div>
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
