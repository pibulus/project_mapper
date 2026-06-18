import { writable } from "svelte/store";
import { browser } from "$app/environment";

export type ThemeType = "cream" | "peach";

export const currentTheme = writable<ThemeType>("cream");

export const themes: {
  id: ThemeType;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  { id: "cream", label: "Vintage Cream", emoji: "🍦", desc: "Warm nostalgia" },
  { id: "peach", label: "Warm Peach", emoji: "🍑", desc: "Sunny coral" },
];

export function initTheme() {
  if (!browser) return;
  const saved = localStorage.getItem("promap_theme") as ThemeType;
  if (saved && ["cream", "peach"].includes(saved)) {
    applyTheme(saved);
  } else {
    applyTheme("cream");
  }
}

export function applyTheme(theme: ThemeType) {
  if (!browser) return;
  currentTheme.set(theme);
  localStorage.setItem("promap_theme", theme);

  // Apply theme class to document element
  const root = document.documentElement;
  root.classList.remove("theme-cream", "theme-peach");
  root.classList.add(`theme-${theme}`);
}

export function cycleTheme() {
  let active: ThemeType = "cream";
  const unsubscribe = currentTheme.subscribe((t) => {
    active = t;
  });
  unsubscribe();
  const currentIndex = themes.findIndex((t) => t.id === active);
  const nextIndex = (currentIndex + 1) % themes.length;
  applyTheme(themes[nextIndex].id);
}
