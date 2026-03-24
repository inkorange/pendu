"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Pendu } from "@inkorange/pendu";
import { Nav } from "@/components/Nav";

const allPhotos = [
  { id: "01", src: "/demo/photos/20241020_143919.jpg", width: 1200, height: 676, alt: "Photo 1" },
  { id: "02", src: "/demo/photos/20250228_135051.jpg", width: 1200, height: 676, alt: "Photo 2" },
  { id: "03", src: "/demo/photos/20250302_152252.jpg", width: 1200, height: 900, alt: "Photo 3" },
  { id: "04", src: "/demo/photos/20250517_085336.jpg", width: 1200, height: 900, alt: "Photo 4" },
  { id: "05", src: "/demo/photos/20250818_085748.jpg", width: 1200, height: 676, alt: "Photo 5" },
  { id: "06", src: "/demo/photos/20250819_105043.jpg", width: 900, height: 1200, alt: "Photo 6" },
  { id: "07", src: "/demo/photos/20250820_194826.jpg", width: 1200, height: 900, alt: "Photo 7" },
  { id: "08", src: "/demo/photos/20260215_092223.jpg", width: 1200, height: 900, alt: "Photo 8" },
  { id: "09", src: "/demo/photos/20260215_135505.jpg", width: 1200, height: 676, alt: "Photo 9" },
  { id: "10", src: "/demo/photos/20260215_141113.jpg", width: 676, height: 1200, alt: "Photo 10" },
  { id: "11", src: "/demo/photos/20260216_124131.jpg", width: 900, height: 1200, alt: "Photo 11" },
  { id: "12", src: "/demo/photos/20260216_144440.jpg", width: 1200, height: 900, alt: "Photo 12" },
  { id: "13", src: "/demo/photos/20260217_131755.jpg", width: 1200, height: 900, alt: "Photo 13" },
  { id: "14", src: "/demo/photos/20260217_134007.jpg", width: 676, height: 1200, alt: "Photo 14" },
  { id: "15", src: "/demo/photos/20260219_180543.jpg", width: 900, height: 1200, alt: "Photo 15" },
  { id: "16", src: "/demo/photos/20260228_125111.jpg", width: 900, height: 1200, alt: "Photo 16" },
  { id: "17", src: "/demo/photos/20260228_182633.jpg", width: 1200, height: 900, alt: "Photo 17" },
];

const VISIBLE_COUNT = 8;
const ROTATE_INTERVAL = 3000;
const TRANSITION_MS = 800;

// Crossfade image component — when src changes, the old image fades/zooms out
// while the new one fades/zooms in
function CrossfadeImage({ src, alt }: { src: string; alt: string }) {
  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "start" | "animate">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rafRef = useRef<number>();

  useEffect(() => {
    if (src === current) return;

    // Phase 1: render new image at starting position (opacity 0, scale 0.9)
    setPrevious(current);
    setCurrent(src);
    setPhase("start");

    // Phase 2: after browser paints the "start" state, flip to "animate"
    // Double rAF ensures the browser has committed the initial styles
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setPhase("animate");
      });
    });

    // Phase 3: clean up after transition completes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPrevious(null);
      setPhase("idle");
    }, TRANSITION_MS + 50);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src, current]);

  const imgBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  const transition = `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`;
  const isTransitioning = phase === "start" || phase === "animate";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Previous image — fades out and zooms up */}
      {previous && (
        <img
          src={previous}
          alt=""
          style={{
            ...imgBase,
            zIndex: 1,
            transition: phase === "animate" ? transition : "none",
            opacity: phase === "animate" ? 0 : 1,
            transform: phase === "animate" ? "scale(1.15)" : "scale(1)",
          }}
        />
      )}
      {/* Current image — zooms in from slightly small and fades in */}
      <img
        src={current}
        alt={alt}
        style={{
          ...imgBase,
          zIndex: isTransitioning ? 0 : 1,
          transition: phase === "animate" ? transition : "none",
          opacity: phase === "start" ? 0 : 1,
          transform: phase === "start" ? "scale(0.85)" : "scale(1)",
        }}
      />
    </div>
  );
}

function buildSlots(photos: typeof allPhotos) {
  return photos.map((photo, i) => ({
    ...photo,
    slotKey: `slot-${i}`,
  }));
}

export default function PhotosExample() {
  const [visible, setVisible] = useState(() => buildSlots(allPhotos.slice(0, VISIBLE_COUNT)));
  const [nextIndex, setNextIndex] = useState(VISIBLE_COUNT);
  const [replaceSlot, setReplaceSlot] = useState(0);
  const [paused, setPaused] = useState(false);

  const rotate = useCallback(() => {
    setVisible((prev) => {
      const next = allPhotos[nextIndex % allPhotos.length];
      const updated = [...prev];
      updated[replaceSlot] = {
        ...next,
        slotKey: `slot-${replaceSlot}`,
      };
      return updated;
    });
    setNextIndex((i) => i + 1);
    setReplaceSlot((s) => (s + 1) % VISIBLE_COUNT);
  }, [nextIndex, replaceSlot]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(rotate, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [rotate, paused]);

  return (
    <>
      <Nav />
      <main className="pt-14 h-screen flex flex-col">
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-sm text-[var(--text-muted)]">
            Photo Gallery — auto-rotating every 3s
          </h1>
          <button
            onClick={() => setPaused(!paused)}
            className="px-3 py-1.5 rounded-md border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <div className="flex-1 mx-[5vw] mb-[5vh]">
          <Pendu gap={10} seed={42}>
            {visible.map((photo) => (
              <Pendu.Item
                key={photo.slotKey}
                width={photo.width}
                height={photo.height}
              >
                <CrossfadeImage src={photo.src} alt={photo.alt} />
              </Pendu.Item>
            ))}
          </Pendu>
        </div>
      </main>
    </>
  );
}
