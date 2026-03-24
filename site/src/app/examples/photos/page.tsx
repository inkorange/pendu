"use client";

import { useState, useEffect, useCallback } from "react";
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

// Build slots with stable keys — the key stays, only the photo swaps
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
      // Replace one slot in-place — other slots keep their position
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
              <Pendu.Image
                key={photo.slotKey}
                src={photo.src}
                width={photo.width}
                height={photo.height}
                alt={photo.alt}
              />
            ))}
          </Pendu>
        </div>
      </main>
    </>
  );
}
