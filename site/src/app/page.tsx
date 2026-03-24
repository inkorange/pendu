import { Nav } from "@/components/Nav";
import { HeroGallery } from "@/components/HeroGallery";
import { CodeBlock } from "@/components/CodeBlock";
import Link from "next/link";
import Image from "next/image";

const installCode = `npm install @inkorange/pendu`;

const quickStartCode = `import { Pendu } from '@inkorange/pendu';

function Gallery() {
  return (
    <Pendu gap={12} seed={42}>
      <Pendu.Image src="/photo-1.jpg" width={1200} height={800} alt="Sunset" />
      <Pendu.Image src="/photo-2.jpg" width={800} height={1200} alt="Portrait" />
      <Pendu.Image src="/photo-3.jpg" width={1600} height={1000} alt="Landscape" />
    </Pendu>
  );
}`;

const dynamicCode = `import { Pendu } from '@inkorange/pendu';
import { useState } from 'react';

function DynamicGallery({ photos }) {
  return (
    <Pendu gap={12}>
      {photos.map((photo) => (
        <Pendu.Image
          key={photo.id}
          src={photo.src}
          width={photo.width}
          height={photo.height}
          alt={photo.alt}
        />
      ))}
    </Pendu>
  );
}`;

const cssVarsCode = `/* Override via CSS variables — no props needed */
.my-gallery {
  --pendu-gap: 16px;
  --pendu-radius: 8px;
  --pendu-bg: #1a1a1a;
}`;

const features = [
  {
    title: "Organic Layouts",
    description:
      "No grid lines, no rigid columns. Images arrange themselves into natural, gallery-wall collages that fill your container.",
  },
  {
    title: "Animated Transitions",
    description:
      "FLIP animations smoothly move images when the gallery changes. Add, remove, or reorder — every transition feels intentional.",
  },
  {
    title: "Container Aware",
    description:
      "Automatically adapts to any container size — fixed, percentage, or viewport units. Images scale and reflow to fill the space.",
  },
  {
    title: "5.4 KB Gzipped",
    description:
      "Zero runtime dependencies. Only 6 files installed — nothing beyond React as a peer dependency. Ships ESM and CJS with full TypeScript types.",
  },
  {
    title: "CSS Variable Theming",
    description:
      "Customize gap, radius, and background via CSS custom properties. No prop drilling needed.",
  },
  {
    title: "Deterministic Seeds",
    description:
      "Same seed + same images = identical layout. Reproducible across renders, servers, and sessions.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="pt-14">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative">
          <div className="hero-glow" />
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Image src="/pendu.png" alt="Pendu" width={280} height={100} priority />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Organic gallery layouts
              {" "}<span className="text-[var(--accent)]">for React</span>
            </h1>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-8">
              A lightweight component that arranges images into beautiful,
              organic collages. No grid. No masonry. Just art.
            </p>
            <div className="flex items-center justify-center gap-4">
              <CodeBlock code={installCode} language="bash" />
            </div>
          </div>
          <HeroGallery />
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Pendu?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]"
              >
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Get started in seconds
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Basic Usage
              </h3>
              <CodeBlock
                code={quickStartCode}
                language="tsx"
                filename="Gallery.tsx"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Dynamic Arrays
              </h3>
              <CodeBlock
                code={dynamicCode}
                language="tsx"
                filename="DynamicGallery.tsx"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                CSS Variable Theming
              </h3>
              <CodeBlock
                code={cssVarsCode}
                language="css"
                filename="styles.css"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to build?</h2>
          <p className="text-[var(--text-muted)] mb-8">
            Explore interactive examples or dive into the API docs.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/examples"
              className="px-6 py-3 rounded-lg bg-[var(--accent-dim)] text-white font-medium hover:bg-[var(--accent)] transition-colors"
            >
              View Examples
            </Link>
            <Link
              href="/docs"
              className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium hover:border-[var(--text-muted)] transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] py-8">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>@inkorange/pendu</span>
            <span>MIT License</span>
          </div>
        </footer>
      </main>
    </>
  );
}
