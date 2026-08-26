// The app's theming, carried over from Orbit-SAT's "standard layout" system.
// We kept the three clean, license-free color palettes and dropped the
// dozen movie/game-themed background packs — they were disabled in the
// source app already and added a lot of image weight for no functional
// benefit. Color theming is still fully here; it's just palettes now,
// not background photography.

import type { ThemeId } from "./types";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  accent: string;
  navBackground: string;
  pageBackground: string;
  recommendedMode: "light" | "dark";
};

export const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Orbit Classic",
    description: "Warm cream with coral accents",
    accent: "#f4774e",
    navBackground: "#111b34",
    pageBackground: "#f7f5ef",
    recommendedMode: "light"
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Sea glass with deep blue",
    accent: "#287f91",
    navBackground: "#17384a",
    pageBackground: "#edf6f7",
    recommendedMode: "light"
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Charcoal with crisp cobalt",
    accent: "#7597ff",
    navBackground: "#111622",
    pageBackground: "#171c25",
    recommendedMode: "dark"
  }
];

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/** Picks readable text (near-black or near-white) for a given background hex color. */
export function readableTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#101727" : "#ffffff";
}
