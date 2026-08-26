// A single shared declaration of the MathJax global, so every component
// that talks to window.MathJax (MathText.tsx, SafeMathText.tsx) agrees on
// its shape instead of each declaring a conflicting, narrower version.
export {};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      typesetClear?: (elements?: HTMLElement[]) => void;
    };
  }
}
