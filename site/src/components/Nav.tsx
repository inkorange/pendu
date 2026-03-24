"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Image src="/pendu.png" alt="Pendu" width={80} height={28} priority />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/examples"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Examples
          </Link>
          <Link
            href="/docs"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/playground"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Playground
          </Link>
          <a
            href="https://github.com/inkorange/pendu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@inkorange/pendu"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-md bg-[var(--accent-dim)] text-white text-xs font-medium hover:bg-[var(--accent)] transition-colors"
          >
            npm
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-[var(--text)] transition-transform duration-200 ${
              open ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-[var(--text)] transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-[var(--text)] transition-transform duration-200 ${
              open ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md">
          <div className="flex flex-col px-6 py-4 gap-4 text-sm">
            <Link
              href="/examples"
              onClick={() => setOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1"
            >
              Examples
            </Link>
            <Link
              href="/docs"
              onClick={() => setOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1"
            >
              Docs
            </Link>
            <Link
              href="/playground"
              onClick={() => setOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1"
            >
              Playground
            </Link>
            <a
              href="https://github.com/inkorange/pendu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@inkorange/pendu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit px-3 py-1.5 rounded-md bg-[var(--accent-dim)] text-white text-xs font-medium hover:bg-[var(--accent)] transition-colors"
            >
              npm
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
