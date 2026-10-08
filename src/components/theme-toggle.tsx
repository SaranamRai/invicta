"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const THEME_EVENT = "invicta-theme-change";

const getThemeSnapshot = (): Theme => {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("invicta-theme") === "dark" ? "dark" : "light";
};

const subscribeToTheme = (callback: () => void) => {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem("invicta-theme", nextTheme);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[9px] font-black uppercase tracking-wider text-foreground transition-all hover:border-accent hover:text-accent"
    >
      <Icon size={14} />
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
