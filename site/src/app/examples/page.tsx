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

const basicCode = `<Pendu gap={12} seed={42}>
  <Pendu.Image src="/photo.jpg" width={1200} height={800} alt="Photo" />
  <Pendu.Image src="/portrait.jpg" width={800} height={1200} alt="Portrait" />
</Pendu>`;

const dynamicCode = `const [photos, setPhotos] = useState(allPhotos);

// Add
setPhotos([...photos, newPhoto]);

// Remove
setPhotos(photos.filter(p => p.id !== removeId));

// The gallery animates automatically
<Pendu gap={12}>
  {photos.map(p => (
    <Pendu.Image key={p.id} {...p} />
  ))}
</Pendu>`;

const containerCode = `{/* Fixed height — gallery scales to fit */}
<div style={{ height: 400 }}>
  <Pendu gap={8}>{...}</Pendu>
</div>

{/* Dynamic — gallery grows with content */}
<div style={{ width: '100%' }}>
  <Pendu gap={8}>{...}</Pendu>
</div>

{/* Viewport units */}
<div style={{ height: '60vh', width: '80vw' }}>
  <Pendu gap={8}>{...}</Pendu>
</div>`;

export default function Examples() {
  const [count, setCount] = useState(5);
  const [gap, setGap] = useState(12);
  const [seed, setSeed] = useState(42);
  const visibleImages = allImages.slice(0, count);

  return (
    <>
      <Nav />
      <main className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-4">Examples</h1>
          <p className="text-[var(--text-muted)] mb-6">
            Interactive demos showing Pendu in action.
          </p>

          <div className="flex flex-wrap gap-3 mb-12">
            <a
              href="/examples/photos"
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
            >
              Photo Gallery →
            </a>
          </div>

          {/* Dynamic add/remove */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2">Dynamic Add & Remove</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Adjust the slider to add or remove images. The gallery animates
              each transition using FLIP animations.
            </p>
            <div className="flex items-center gap-6 mb-6">
              <label className="text-sm text-[var(--text-muted)]">
                Images: {count}
              </label>
              <input
                type="range"
                min={1}
                max={8}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="flex-1 max-w-xs"
              />
            </div>
            <div className="h-[400px] rounded-xl overflow-hidden border border-[var(--border)] mb-6">
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
            <CodeBlock code={dynamicCode} language="tsx" filename="DynamicGallery.tsx" />
          </section>

          {/* Props control */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2">Gap & Seed</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Control spacing and layout randomization. Same seed always
              produces the same layout.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 mb-6">
              <div className="flex items-center gap-3">
                <label className="text-sm text-[var(--text-muted)]">
                  Gap: {gap}px
                </label>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[var(--text-muted)]">
                  Seed: {seed}
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="w-32"
                />
              </div>
            </div>
            <div className="h-[400px] rounded-xl overflow-hidden border border-[var(--border)] mb-6">
              <Pendu gap={gap} seed={seed}>
                {allImages.map((img) => (
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
            <CodeBlock code={basicCode} language="tsx" filename="Gallery.tsx" />
          </section>

          {/* Container modes */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2">Container Modes</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Pendu fills whatever container you give it — fixed height,
              percentage, or viewport units.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Fixed 300px height
                </p>
                <div className="h-[300px] rounded-xl overflow-hidden border border-[var(--border)]">
                  <Pendu gap={8} seed={7}>
                    {allImages.slice(0, 6).map((img) => (
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
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Dynamic height (auto)
                </p>
                <div className="rounded-xl overflow-hidden border border-[var(--border)]">
                  <Pendu gap={8} seed={7}>
                    {allImages.slice(0, 6).map((img) => (
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
            </div>
            <CodeBlock code={containerCode} language="tsx" filename="ContainerModes.tsx" />
          </section>
        </div>
      </main>
    </>
  );
}
