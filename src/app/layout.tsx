import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit SAT Math",
  description: "Adaptive SAT Math practice with real questions and real progress tracking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Loaded once, globally, so any page can render math with <MathText />. */}
        <Script id="mathjax-config" strategy="beforeInteractive">
          {`window.MathJax = { tex: { inlineMath: [["\\\\(", "\\\\)"]] }, svg: { fontCache: "global" } };`}
        </Script>
        <Script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
