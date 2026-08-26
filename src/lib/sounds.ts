// Small sound effects for Quick Practice feedback — a correct answer, an
// incorrect one, and finishing a session. Files live in public/sounds/ so
// they're served as plain static assets, no bundler involvement needed.

const SOUND_FILES = {
  correct: "/sounds/answer-correct.mp3",
  incorrect: "/sounds/answer-incorrect.mp3",
  practiceComplete: "/sounds/practice-complete.mp3"
} as const;

export type SoundName = keyof typeof SOUND_FILES;

export function playSound(name: SoundName) {
  if (typeof window === "undefined") return;
  const audio = new Audio(SOUND_FILES[name]);
  audio.play().catch(() => {
    // Browsers can block autoplay outside a direct user gesture — the
    // question/result still shows either way, so this is safe to ignore.
  });
}
