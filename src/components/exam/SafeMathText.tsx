"use client";

// The Full Test's math renderer. Same idea as the site's plain <MathText/>
// component, but adds the original app's safety net: if the stored LaTeX
// has unbalanced braces or stray HTML, or MathJax fails to typeset it
// after a few retries, this shows a readable Unicode approximation
// instead of broken math or a blank space.
//
// The readable fallback is shown FIRST, immediately, before MathJax is
// ever asked to typeset anything — not just after retries are exhausted.
// Earlier this set the raw `\(...\)`-wrapped TeX source as the visible
// text while waiting on MathJax, which meant that on a slow load (or a
// step that got reused instead of freshly mounted — see the `key` on
// each step in StepSolutionReview.tsx) a student could end up seeing
// literal backslash-laden TeX instead of math. Now MathJax only ever
// replaces an already-readable fallback; it never has a raw-source state
// to leave behind.

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

    // Always start from something readable — this is also the final state
    // if MathJax never becomes available or the content isn't safe to
    // typeset at all.
    node.textContent = readableMathFallback(clean);
    if (!mathStructurallySafe(clean)) return;

    let attempts = 0;
    let cancelled = false;
    const timeouts: number[] = [];

    const typeset = () => {
      if (cancelled) return;
      attempts++;

      const mathjax = window.MathJax;
      if (!mathjax?.typesetPromise) {
        if (attempts < MAX_ATTEMPTS) timeouts.push(window.setTimeout(typeset, RETRY_DELAY_MS));
        return; // the readable fallback set above is already showing
      }

      try {
        mathjax.typesetClear?.([node]);
      } catch {
        // Nothing to clear on the first render — safe to ignore.
      }

      // This is the only moment raw TeX source is ever in the DOM — it's
      // what MathJax reads to know what to typeset, and it's immediately
      // replaced below on both the success and failure paths.
      node.textContent = `\\(${clean}\\)`;
      mathjax
        .typesetPromise([node])
        .then(() => {
          if (cancelled) return;
          if (node.querySelector("mjx-container")) return;
          node.textContent = readableMathFallback(clean);
          if (attempts < MAX_ATTEMPTS) timeouts.push(window.setTimeout(typeset, RETRY_DELAY_MS));
        })
        .catch(() => {
          if (cancelled) return;
          node.textContent = readableMathFallback(clean);
          if (attempts < MAX_ATTEMPTS) timeouts.push(window.setTimeout(typeset, RETRY_DELAY_MS));
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
