"use client";

// Renders a string that may contain TeX math (wrapped in \( ... \) by the
// caller, or plain text with no math at all) using the MathJax script
// loaded once in the root layout. This is the one place in the app that
// talks to `window.MathJax` directly — everything else just renders
// <MathText> like a normal component.

import { useRef } from "react";
import type { ElementType } from "react";

export function MathText({ text, as = "span" }: { text: string; as?: ElementType }) {
  const nodeRef = useRef<HTMLElement | null>(null);
  const Tag = as;

  // A callback ref (instead of a plain object ref) sidesteps TypeScript
  // trying to resolve a single ref type across every possible HTML tag —
  // it just runs this function with whatever element gets mounted.
  const setNode = (node: HTMLElement | null) => {
    nodeRef.current = node;
    if (node) {
      window.MathJax?.typesetPromise?.([node]).catch(() => {
        // MathJax not loaded yet (e.g. first paint) — the text still shows
        // as plain text, which is a safe fallback.
      });
    }
  };

  return (
    <Tag ref={setNode}>{wrapMath(text)}</Tag>
  );
}

/** Wraps any TeX-looking command sequence in \( ... \) delimiters MathJax expects. */
function wrapMath(text: string): string {
  if (!/\\[a-zA-Z]/.test(text)) return text;
  if (text.includes("\\(")) return text;
  return `\\(${text}\\)`;
}
