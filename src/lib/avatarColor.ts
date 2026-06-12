// src/lib/avatarColor.ts

// Background + text pairs kept within the app's green/warm palette so the
// generated colors never clash with the UI. Add or tweak freely.
const COLORS: { bg: string; text: string }[] = [
  { bg: "#2f9c95", text: "#fafdf8" }, // teal-600
  { bg: "#664147", text: "#fafdf8" }, // wine
  { bg: "#703d57", text: "#fafdf8" }, // plum
  { bg: "#10211e", text: "#fafdf8" }, // ink
];

// Stable string hash (djb2). Same input → same number every time.
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0; // force unsigned
}

// Pick a deterministic color pair from any seed (player id, event id, …).
export function colorFromSeed(seed: string): { bg: string; text: string } {
  return COLORS[hash(seed) % COLORS.length];
}