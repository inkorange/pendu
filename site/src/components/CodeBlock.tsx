"use client";

import { useState, useMemo } from "react";

// Token types with associated colors
const TOKEN_COLORS: Record<string, string> = {
  keyword: "#c084fc",     // purple — import, from, const, function, return, etc.
  component: "#7dd3fc",   // light blue — JSX tags like <Pendu>, <Pendu.Image>
  string: "#86efac",      // green — 'strings' and "strings"
  comment: "#6b7280",     // gray — // comments and /* */
  property: "#fbbf24",    // amber — prop names in JSX, CSS properties
  number: "#f9a8d4",      // pink — numbers
  punctuation: "#6b7280", // gray — brackets, parens
  operator: "#94a3b8",    // slate — =, =>, ?, :
  builtin: "#f0abfc",     // light purple — true, false, null, undefined
};

interface Token {
  type: string;
  value: string;
}

function tokenize(code: string, language: string): Token[] {
  const tokens: Token[] = [];
  let remaining = code;

  const patterns: [string, RegExp][] = language === "css"
    ? [
        ["comment", /^\/\*[\s\S]*?\*\//],
        ["comment", /^\/\/.*/],
        ["property", /^[\w-]+(?=\s*:)/],
        ["string", /^"[^"]*"|^'[^']*'/],
        ["number", /^-?\d+\.?\d*(px|rem|em|vh|vw|%|s|ms)?/],
        ["keyword", /^@(import|media|keyframes|font-face)\b/],
        ["punctuation", /^[{}();,]/],
        ["operator", /^:/],
      ]
    : [
        ["comment", /^\/\/.*/],
        ["comment", /^\/\*[\s\S]*?\*\//],
        ["string", /^`[^`]*`/],
        ["string", /^"[^"]*"|^'[^']*'/],
        ["component", /^<\/?[\w]+\.[\w]+/],     // <Pendu.Image, </Pendu.Item
        ["component", /^<\/?[A-Z][\w]*/],         // <Pendu, <Gallery, </Gallery
        ["keyword", /^(import|export|from|const|let|var|function|return|if|else|default|typeof|new|await|async|type|interface)\b/],
        ["builtin", /^(true|false|null|undefined|React)\b/],
        ["property", /^[\w]+(?=\s*[=:](?!=))/],   // prop= or key:
        ["property", /^\.[\w]+\b/],                // .map, .filter
        ["number", /^-?\d+\.?\d*/],
        ["punctuation", /^[{}()[\];,<>\/]/],
        ["operator", /^(=>|===|!==|&&|\|\||[=!?:])/],
      ];

  while (remaining.length > 0) {
    // Whitespace
    const wsMatch = remaining.match(/^\s+/);
    if (wsMatch) {
      tokens.push({ type: "plain", value: wsMatch[0] });
      remaining = remaining.slice(wsMatch[0].length);
      continue;
    }

    let matched = false;
    for (const [type, regex] of patterns) {
      const match = remaining.match(regex);
      if (match) {
        tokens.push({ type, value: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Consume one word or character
      const wordMatch = remaining.match(/^[\w$]+/);
      if (wordMatch) {
        tokens.push({ type: "plain", value: wordMatch[0] });
        remaining = remaining.slice(wordMatch[0].length);
      } else {
        tokens.push({ type: "plain", value: remaining[0] });
        remaining = remaining.slice(1);
      }
    }
  }

  return tokens;
}

function HighlightedCode({ code, language }: { code: string; language: string }) {
  const tokens = useMemo(() => tokenize(code, language), [code, language]);

  return (
    <>
      {tokens.map((token, i) => {
        const color = TOKEN_COLORS[token.type];
        if (!color) return <span key={i}>{token.value}</span>;
        return (
          <span key={i} style={{ color }}>
            {token.value}
          </span>
        );
      })}
    </>
  );
}

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
        <code className={`language-${language}`}>
          <HighlightedCode code={code} language={language} />
        </code>
      </pre>
    </div>
  );
}
