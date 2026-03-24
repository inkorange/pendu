"use client";

import { useState, useEffect, useCallback } from "react";
import { Pendu } from "@inkorange/pendu";
import { Nav } from "@/components/Nav";

const allPhotos = [
  { id: "01", src: "/demo/photos/20241020_143919.jpg", width: 1200, height: 676, handle: "@wanderlust", caption: "Nothing beats a view like this", alt: "Photo 1" },
  { id: "02", src: "/demo/photos/20250228_135051.jpg", width: 1200, height: 676, handle: "@sunset.chaser", caption: "Caught the last light of the day", alt: "Photo 2" },
  { id: "03", src: "/demo/photos/20250302_152252.jpg", width: 1200, height: 900, handle: "@naturegram", caption: "The quiet side of the island", alt: "Photo 3" },
  { id: "04", src: "/demo/photos/20250517_085336.jpg", width: 1200, height: 900, handle: "@explorers.co", caption: "Every trail tells a story", alt: "Photo 4" },
  { id: "05", src: "/demo/photos/20250818_085748.jpg", width: 1200, height: 676, handle: "@coastvibes", caption: "Salt air and no agenda", alt: "Photo 5" },
  { id: "06", src: "/demo/photos/20250819_105043.jpg", width: 900, height: 1200, handle: "@trailmix", caption: "Found this hidden gem off the path", alt: "Photo 6" },
  { id: "07", src: "/demo/photos/20250820_194826.jpg", width: 1200, height: 900, handle: "@goldenhour", caption: "Magic happens at golden hour", alt: "Photo 7" },
  { id: "08", src: "/demo/photos/20260215_092223.jpg", width: 1200, height: 900, handle: "@peaks.daily", caption: "Morning fog rolling through", alt: "Photo 8" },
  { id: "09", src: "/demo/photos/20260215_135505.jpg", width: 1200, height: 676, handle: "@driftwood", caption: "Textures you can only find here", alt: "Photo 9" },
  { id: "10", src: "/demo/photos/20260215_141113.jpg", width: 676, height: 1200, handle: "@vertigo.shot", caption: "Looking up changes everything", alt: "Photo 10" },
  { id: "11", src: "/demo/photos/20260216_124131.jpg", width: 900, height: 1200, handle: "@mossy.stones", caption: "Nature always finds a way", alt: "Photo 11" },
  { id: "12", src: "/demo/photos/20260216_144440.jpg", width: 1200, height: 900, handle: "@tidepools", caption: "Low tide reveals the best secrets", alt: "Photo 12" },
  { id: "13", src: "/demo/photos/20260217_131755.jpg", width: 1200, height: 900, handle: "@lava.fields", caption: "Walking where the earth was born", alt: "Photo 13" },
  { id: "14", src: "/demo/photos/20260217_134007.jpg", width: 676, height: 1200, handle: "@volcanic", caption: "Raw power, frozen in time", alt: "Photo 14" },
  { id: "15", src: "/demo/photos/20260219_180543.jpg", width: 900, height: 1200, handle: "@island.life", caption: "This is what slow living looks like", alt: "Photo 15" },
  { id: "16", src: "/demo/photos/20260228_125111.jpg", width: 900, height: 1200, handle: "@reef.walker", caption: "The ocean floor is another world", alt: "Photo 16" },
  { id: "17", src: "/demo/photos/20260228_182633.jpg", width: 1200, height: 900, handle: "@horizon.line", caption: "Where the sky meets the sea", alt: "Photo 17" },
  { id: "18", src: "/demo/photos/20240624_205738.jpg", width: 700, height: 1441, handle: "@tall.tales", caption: "Some views go on forever", alt: "Photo 18" },
];

const VISIBLE_COUNT = 6;
const ROTATE_INTERVAL = 3000;
const TRANSITION_MS = 800;


function SocialCard({
  src,
  handle,
  caption,
  alt,
}: {
  src: string;
  handle: string;
  caption: string;
  alt: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: 8,
        border: "8px solid #000",
        background: "#000",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <img
          src={src}
          alt={alt}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Gradient overlay at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "40%",
            background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        />

        {/* Handle badge */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 11,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 20,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {handle}
          </span>
        </div>

        {/* Caption bar at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 14px",
            background: "rgba(0, 0, 0, 0.75)",
            zIndex: 10,
          }}
        >
          <p
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: 400,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommentsExample() {
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
  const [visible, setVisible] = useState(allPhotos.slice(0, VISIBLE_COUNT));
  const [nextIndex, setNextIndex] = useState(VISIBLE_COUNT);
  const [replaceSlot, setReplaceSlot] = useState(0);
  const [paused, setPaused] = useState(false);

  const rotate = useCallback(() => {
    setVisible((prev) => {
      const next = allPhotos[nextIndex % allPhotos.length];
      const updated = [...prev];
      updated[replaceSlot] = next;
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
            Social Cards — custom components in Pendu.Item
          </h1>
          <button
            onClick={() => setPaused(!paused)}
            className="px-3 py-1.5 rounded-md border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <div className="flex-1 mx-[5vw] mb-[5vh]">
          <Pendu gap={16} seed={seed} animationDuration={600} {...{ animationStyle: "slide" } as Record<string, unknown>}>
            {visible.map((photo) => (
              <Pendu.Item
                key={photo.id}
                width={photo.width}
                height={photo.height}
              >
                <SocialCard
                  src={photo.src}
                  handle={photo.handle}
                  caption={photo.caption}
                  alt={photo.alt}
                />
              </Pendu.Item>
            ))}
          </Pendu>
        </div>
      </main>
    </>
  );
}
