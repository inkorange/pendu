import Link from "next/link";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          pendu
        </Link>
        <div className="flex items-center gap-6 text-sm">
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
      </div>
    </nav>
  );
}
