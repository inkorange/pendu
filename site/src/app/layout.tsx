import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pendu — Organic Gallery Layouts for React",
  description:
    "A lightweight React component that arranges images into beautiful, organic collage layouts. No grid. No masonry. Just art.",
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
