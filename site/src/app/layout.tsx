import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pendu — Organic Gallery Layouts for React",
    template: "%s | Pendu",
  },
  description:
    "A lightweight React component that arranges images into beautiful, organic collage layouts. No grid. No masonry. Just art. ~6KB gzipped.",
  keywords: [
    "react",
    "gallery",
    "layout",
    "collage",
    "organic",
    "image gallery",
    "react component",
    "npm package",
    "masonry alternative",
    "photo gallery",
    "FLIP animation",
    "responsive gallery",
  ],
  authors: [{ name: "Chris West", url: "https://github.com/inkorange" }],
  creator: "inkOrange",
  openGraph: {
    type: "website",
    title: "Pendu — Organic Gallery Layouts for React",
    description:
      "Arrange images and custom content into beautiful, natural collages. No grid. No masonry. Just art.",
    siteName: "Pendu",
    images: [{ url: "/pendu.png", width: 1000, height: 350, alt: "Pendu logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pendu — Organic Gallery Layouts for React",
    description:
      "A lightweight React component for beautiful, organic gallery layouts. ~6KB gzipped.",
    images: ["/pendu.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/icon.png" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
