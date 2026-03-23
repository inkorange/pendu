"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  language = "tsx",
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[var(--border)] overflow-hidden">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-code)] border-b border-[var(--border)]">
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {filename}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre className="p-4 bg-[var(--bg-code)] overflow-x-auto text-sm leading-relaxed">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}
