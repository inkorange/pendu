"use client";

import { useState } from "react";
import { Pendu } from "@inkorange/pendu";
import { Nav } from "@/components/Nav";
import { CodeBlock } from "@/components/CodeBlock";

const allImages = [
  { id: "l1", src: "/demo/landscape-1.jpg", width: 1200, height: 800, alt: "Landscape 1" },
  { id: "p1", src: "/demo/portrait-1.jpg", width: 800, height: 1200, alt: "Portrait 1" },
  { id: "l2", src: "/demo/landscape-2.jpg", width: 1600, height: 1000, alt: "Landscape 2" },
  { id: "p2", src: "/demo/portrait-2.jpg", width: 800, height: 800, alt: "Portrait 2" },
  { id: "l3", src: "/demo/landscape-3.jpg", width: 1400, height: 800, alt: "Landscape 3" },
  { id: "p3", src: "/demo/portrait-3.jpg", width: 1200, height: 1800, alt: "Portrait 3" },
  { id: "l4", src: "/demo/landscape-4.jpg", width: 900, height: 600, alt: "Landscape 4" },
  { id: "p4", src: "/demo/portrait-4.jpg", width: 1200, height: 1600, alt: "Portrait 4" },
];

export default function Playground() {
  const [count, setCount] = useState(8);
  const [gap, setGap] = useState(12);
  const [seed, setSeed] = useState(42);
  const [height, setHeight] = useState(500);
  const [dynamicHeight, setDynamicHeight] = useState(false);
  const [borderRadius, setBorderRadius] = useState(0);
  const [bgColor, setBgColor] = useState("#0a0a0a");

  const visibleImages = allImages.slice(0, count);

  const generatedCode = `import { Pendu } from '@inkorange/pendu';

function MyGallery() {
  return (${dynamicHeight ? "" : `
    <div style={{ height: ${height} }}>`}
      <Pendu gap={${gap}} seed={${seed}}${borderRadius > 0 ? ` className="custom-gallery"` : ""}>
        {images.map(img => (
          <Pendu.Image
            key={img.id}
            src={img.src}
            width={img.width}
            height={img.height}
            alt={img.alt}
          />
        ))}
      </Pendu>${dynamicHeight ? "" : `
    </div>`}
  );
}${borderRadius > 0 ? `

/* CSS */
.custom-gallery {
  --pendu-radius: ${borderRadius}px;
}` : ""}`;

  return (
    <>
      <Nav />
      <main className="pt-14">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-4">Playground</h1>
          <p className="text-[var(--text-muted)] mb-8">
            Tweak every parameter and see the result live. The code updates as
            you change settings.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
            {/* Controls */}
            <div className="space-y-6 p-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] h-fit lg:sticky lg:top-20">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--text-muted)]">
                Controls
              </h3>

              <div>
                <label className="text-sm text-[var(--text-muted)] flex justify-between mb-1">
                  <span>Images</span>
                  <span>{count}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm text-[var(--text-muted)] flex justify-between mb-1">
                  <span>Gap</span>
                  <span>{gap}px</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm text-[var(--text-muted)] flex justify-between mb-1">
                  <span>Seed</span>
                  <span>{seed}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm text-[var(--text-muted)] flex justify-between mb-1">
                  <span>Border Radius</span>
                  <span>{borderRadius}px</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={borderRadius}
                  onChange={(e) => setBorderRadius(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-[var(--text-muted)]">
                  Dynamic Height
                </label>
                <button
                  onClick={() => setDynamicHeight(!dynamicHeight)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    dynamicHeight ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      dynamicHeight ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {!dynamicHeight && (
                <div>
                  <label className="text-sm text-[var(--text-muted)] flex justify-between mb-1">
                    <span>Height</span>
                    <span>{height}px</span>
                  </label>
                  <input
                    type="range"
                    min={200}
                    max={800}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-[var(--text-muted)] mb-1 block">
                  Background
                </label>
                <div className="flex gap-2">
                  {["#0a0a0a", "#1a1a2e", "#1a2e1a", "#2e1a1a", "#ffffff"].map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() => setBgColor(c)}
                        className={`w-8 h-8 rounded-md border-2 transition-colors cursor-pointer ${
                          bgColor === c
                            ? "border-[var(--accent)]"
                            : "border-[var(--border)]"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Preview + Code */}
            <div className="space-y-6">
              <div
                className="rounded-xl overflow-hidden border border-[var(--border)]"
                style={{
                  height: dynamicHeight ? "auto" : height,
                  backgroundColor: bgColor,
                  ["--pendu-radius" as string]: `${borderRadius}px`,
                }}
              >
                <Pendu gap={gap} seed={seed}>
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

              <div>
                <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Generated Code
                </h3>
                <CodeBlock code={generatedCode} language="tsx" filename="MyGallery.tsx" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
