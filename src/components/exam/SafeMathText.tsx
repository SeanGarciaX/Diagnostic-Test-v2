"use client";

// The Full Test's math renderer. Same idea as the site's plain <MathText/>
// component, but adds the original app's safety net: if the stored LaTeX
// has unbalanced braces or stray HTML, or MathJax fails to typeset it
// after a few retries, this shows a readable Unicode approximation
// instead of broken math or a blank space.

import { useEffect, useRef } from "react";
import { mathStructurallySafe, normalizeLatex, readableMathFallback } from "@/lib/exam/mathSafe";

const MAX_ATTEMPTS = 40;
const RETRY_DELAY_MS = 75;

export function SafeMathText({ tex, className, as: Tag = "span" }: { tex: string; className?: string; as?: "span" | "div" }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const clean = normalizeLatex(tex);
    if (!clean) return;

    if (!mathStructurallySafe(clean)) {
      node.textContent = readableMathFallback(clean);
      return;
    }

    let attempts = 0;
    let cancelled = false;
    const timeouts: number[] = [];

    const typeset = () => {
      if (cancelled) return;
      attempts++;

      const mathjax = window.MathJax;
      if (!mathjax?.typesetPromise) {
        if (attempts < MAX_ATTEMPTS) {
          timeouts.push(window.setTimeout(typeset, RETRY_DELAY_MS));
        } else {
          node.textContent = readableMathFallback(clean);
        }
        return;
      }

      try {
        mathjax.typesetClear?.([node]);
      } catch {
        // Nothing to clear on the first render — safe to ignore.
      }

      node.textContent = `\\(${clean}\\)`;
      mathjax
        .typesetPromise([node])
        .then(() => {
          if (cancelled) return;
          if (node.querySelector("mjx-container")) return;
          if (attempts < MAX_ATTEMPTS) timeouts.push(window.setTimeout(typeset, RETRY_DELAY_MS));
          else node.textContent = readableMathFallback(clean);
        })
        .catch(() => {
          if (cancelled) return;
          if (attempts < MAX_ATTEMPTS) timeouts.push(window.setTimeout(typeset, RETRY_DELAY_MS));
          else node.textContent = readableMathFallback(clean);
        });
    };

    typeset();
    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [tex]);

  return <Tag ref={ref as never} className={className} />;
}
