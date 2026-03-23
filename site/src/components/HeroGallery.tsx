"use client";

import { useState } from "react";
import { Pendu } from "@inkorange/pendu";

const baseImages = [
  { src: "/demo/landscape-1.jpg", width: 1200, height: 800, alt: "Landscape 1" },
  { src: "/demo/portrait-1.jpg", width: 800, height: 1200, alt: "Portrait 1" },
  { src: "/demo/landscape-2.jpg", width: 1600, height: 1000, alt: "Landscape 2" },
  { src: "/demo/portrait-2.jpg", width: 800, height: 800, alt: "Portrait 2" },
  { src: "/demo/landscape-3.jpg", width: 1400, height: 800, alt: "Landscape 3" },
  { src: "/demo/portrait-3.jpg", width: 1200, height: 1800, alt: "Portrait 3" },
  { src: "/demo/landscape-4.jpg", width: 900, height: 600, alt: "Landscape 4" },
  { src: "/demo/portrait-4.jpg", width: 1200, height: 1600, alt: "Portrait 4" },
];

// Duplicate images with unique keys to support up to 18
const images = [
  ...baseImages.map((img, i) => ({ ...img, id: `a-${i}` })),
  ...baseImages.map((img, i) => ({ ...img, id: `b-${i}` })),
  ...baseImages.slice(0, 2).map((img, i) => ({ ...img, id: `c-${i}` })),
];

export function HeroGallery() {
  const [count, setCount] = useState(8);
  const [seed, setSeed] = useState(42);

  const visibleImages = images.slice(0, count);

  return (
    <div>
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm text-[var(--text-muted)] whitespace-nowrap">
            Images: {count}
          </label>
          <input
            type="range"
            min={1}
            max={18}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <button
          onClick={() => setSeed(Math.floor(Math.random() * 100000))}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
        >
          Shuffle Layout
        </button>
      </div>
      <div className="w-full h-[500px] rounded-xl overflow-hidden border border-[var(--border)]">
        <Pendu gap={8} seed={seed}>
          {visibleImages.map((img) => (
            <Pendu.Image
              key={img.id}
              src={img.src}
              width={img.width}
              height={img.height}
              alt={img.alt}
            />
          ))}
        </Pendu>
      </div>
    </div>
  );
}
