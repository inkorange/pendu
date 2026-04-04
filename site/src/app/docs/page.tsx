import { Nav } from "@/components/Nav";
import { CodeBlock } from "@/components/CodeBlock";

const installCode = `npm install @inkorange/pendu`;

const importCode = `import { Pendu } from '@inkorange/pendu';`;

const propsTable = [
  { prop: "gap", type: "number", default: "8", description: "Space between images in pixels" },
  { prop: "seed", type: "number", default: "42", description: "Random seed for deterministic layouts. Same seed = same layout." },
  { prop: "padding", type: "number", default: "0", description: "Inner padding of the gallery container" },
  { prop: "lazy", type: "boolean", default: "false", description: "Enable native lazy loading on all images" },
  { prop: "minItemWidth", type: "number", default: "—", description: "Minimum frame width in pixels (preserves aspect ratio)" },
  { prop: "maxItemWidth", type: "number", default: "—", description: "Maximum frame width in pixels (preserves aspect ratio)" },
  { prop: "onLayoutChange", type: "(result: LayoutResult) => void", default: "—", description: "Callback fired after each layout computation" },
  { prop: "className", type: "string", default: "—", description: "CSS class applied to the gallery root element" },
];

const imagePropsTable = [
  { prop: "src", type: "string", default: "required", description: "Image source URL" },
  { prop: "width", type: "number", default: "required", description: "Original image width (for aspect ratio)" },
  { prop: "height", type: "number", default: "required", description: "Original image height (for aspect ratio)" },
  { prop: "alt", type: "string", default: '""', description: "Alt text for accessibility" },
  { prop: "loading", type: "'lazy' | 'eager'", default: "—", description: "Native image loading strategy (overrides Pendu lazy prop)" },
];

const itemPropsTable = [
  { prop: "width", type: "number", default: "required", description: "Desired width (for aspect ratio calculation)" },
  { prop: "height", type: "number", default: "required", description: "Desired height (for aspect ratio calculation)" },
  { prop: "children", type: "ReactNode", default: "required", description: "Content to render inside the frame" },
  { prop: "className", type: "string", default: "—", description: "CSS class on the item wrapper" },
];

const cssVarsTable = [
  { variable: "--pendu-gap", default: "8px", description: "Override gap between images" },
  { variable: "--pendu-radius", default: "0", description: "Border radius on image frames" },
  { variable: "--pendu-bg", default: "transparent", description: "Background color of the gallery" },
  { variable: "--pendu-transition", default: "0.4s ease", description: "Transition timing for FLIP animations" },
];

const cssOverrideCode = `.my-gallery {
  --pendu-gap: 16px;
  --pendu-radius: 8px;
  --pendu-bg: #111;
  --pendu-transition: 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
}

<Pendu className="my-gallery" gap={16}>
  {/* images */}
</Pendu>`;

const dynamicExample = `import { useState } from 'react';
import { Pendu } from '@inkorange/pendu';

function PhotoManager() {
  const [photos, setPhotos] = useState(initialPhotos);

  const addPhoto = (photo) => {
    setPhotos(prev => [...prev, photo]);
  };

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <Pendu gap={12} seed={7}>
      {photos.map(photo => (
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

const itemExample = `import { Pendu } from '@inkorange/pendu';

function MixedGallery() {
  return (
    <Pendu gap={12}>
      <Pendu.Image src="/photo.jpg" width={1200} height={800} alt="Photo" />

      <Pendu.Item width={400} height={300}>
        <video src="/clip.mp4" autoPlay muted loop
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Pendu.Item>

      <Pendu.Item width={400} height={400}>
        <div style={{ padding: 24, background: '#1a1a2e', color: '#fff' }}>
          <h3>New Collection</h3>
          <p>Explore the latest additions</p>
        </div>
      </Pendu.Item>
    </Pendu>
  );
}`;

export default function Docs() {
  return (
    <>
      <Nav />
      <main className="pt-14">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-[var(--text-muted)] mb-12">
            Everything you need to use Pendu in your React application.
          </p>

          {/* Installation */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Installation</h2>
            <CodeBlock code={installCode} language="bash" />
            <div className="mt-4">
              <CodeBlock code={importCode} language="tsx" />
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-3">
              Requires React 18+ as a peer dependency. Works with Next.js,
              Vite, CRA, and any React setup.
            </p>
          </section>

          {/* Pendu Props */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">
              <code className="text-[var(--accent)]">&lt;Pendu&gt;</code> Props
            </h2>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                    <th className="text-left p-3 font-medium">Prop</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Default</th>
                    <th className="text-left p-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {propsTable.map((row) => (
                    <tr key={row.prop} className="border-b border-[var(--border)]">
                      <td className="p-3 font-mono text-[var(--accent)]">{row.prop}</td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{row.type}</td>
                      <td className="p-3 font-mono text-xs">{row.default}</td>
                      <td className="p-3 text-[var(--text-muted)]">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pendu.Image Props */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">
              <code className="text-[var(--accent)]">&lt;Pendu.Image&gt;</code>{" "}
              Props
            </h2>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                    <th className="text-left p-3 font-medium">Prop</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Default</th>
                    <th className="text-left p-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {imagePropsTable.map((row) => (
                    <tr key={row.prop} className="border-b border-[var(--border)]">
                      <td className="p-3 font-mono text-[var(--accent)]">{row.prop}</td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{row.type}</td>
                      <td className="p-3 font-mono text-xs">{row.default}</td>
                      <td className="p-3 text-[var(--text-muted)]">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pendu.Item Props */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">
              <code className="text-[var(--accent)]">&lt;Pendu.Item&gt;</code>{" "}
              Props
            </h2>
            <p className="text-[var(--text-muted)] mb-4">
              Use <code className="text-[var(--accent)]">&lt;Pendu.Item&gt;</code>{" "}
              for custom content — videos, cards, CTAs, or any React component.
              Provide <code>width</code> and <code>height</code> for aspect ratio
              calculation; the layout engine handles sizing and positioning.
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                    <th className="text-left p-3 font-medium">Prop</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Default</th>
                    <th className="text-left p-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {itemPropsTable.map((row) => (
                    <tr key={row.prop} className="border-b border-[var(--border)]">
                      <td className="p-3 font-mono text-[var(--accent)]">{row.prop}</td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{row.type}</td>
                      <td className="p-3 font-mono text-xs">{row.default}</td>
                      <td className="p-3 text-[var(--text-muted)]">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock code={itemExample} language="tsx" filename="MixedGallery.tsx" />
          </section>

          {/* CSS Variables */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">CSS Variables</h2>
            <p className="text-[var(--text-muted)] mb-4">
              Override styles without props by setting CSS custom properties on
              the gallery or any ancestor.
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                    <th className="text-left p-3 font-medium">Variable</th>
                    <th className="text-left p-3 font-medium">Default</th>
                    <th className="text-left p-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {cssVarsTable.map((row) => (
                    <tr key={row.variable} className="border-b border-[var(--border)]">
                      <td className="p-3 font-mono text-[var(--accent)]">{row.variable}</td>
                      <td className="p-3 font-mono text-xs">{row.default}</td>
                      <td className="p-3 text-[var(--text-muted)]">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock code={cssOverrideCode} language="css" filename="styles.css" />
          </section>

          {/* Dynamic Usage */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Dynamic Images</h2>
            <p className="text-[var(--text-muted)] mb-4">
              Pendu reacts to children changes automatically. Add or remove{" "}
              <code className="text-[var(--accent)]">&lt;Pendu.Image&gt;</code>{" "}
              or <code className="text-[var(--accent)]">&lt;Pendu.Item&gt;</code>{" "}
              elements and the gallery re-layouts with smooth FLIP animations.
              Use stable <code>key</code> props so React can track each element.
            </p>
            <CodeBlock
              code={dynamicExample}
              language="tsx"
              filename="PhotoManager.tsx"
            />
          </section>

          {/* Container Behavior */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Container Behavior</h2>
            <div className="space-y-4 text-[var(--text-muted)]">
              <p>
                <strong className="text-[var(--text)]">
                  Dynamic height (default):
                </strong>{" "}
                The gallery grows vertically to fit all images. The container
                only needs a width.
              </p>
              <p>
                <strong className="text-[var(--text)]">Fixed height:</strong>{" "}
                When the parent has a fixed height (px, vh, %), the gallery
                scales the entire layout to fit both width and height
                constraints. More images in a smaller area means smaller images.
              </p>
              <p>
                <strong className="text-[var(--text)]">Responsive:</strong>{" "}
                Pendu observes container resizes and re-layouts automatically.
                No additional code needed.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
