"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "dezaakir-theme";
export const DEFAULT_THEME: Theme = "dark";

const THEME_COLORS: Record<Theme, string> = {
  dark: "#0B1628",
  light: "#FFFFFF",
};

/**
 * Blocking inline script injected in <head> by the root layout. It runs before
 * first paint so the saved theme is applied immediately (no flash of the wrong
 * theme). Dark Mode is the default for first-time visitors.
 */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=${JSON.stringify(DEFAULT_THEME)};}var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(t);r.style.colorScheme=t;}catch(e){document.documentElement.classList.add(${JSON.stringify(DEFAULT_THEME)});}})();`;

interface ThemeContextValue {
  theme: Theme;
  /** False until the client has read the persisted theme (use to avoid hydration mismatches). */
  mounted: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readDocumentTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) root.classList.add("theme-transition");
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLORS[theme];

  if (animate) {
    window.setTimeout(() => root.classList.remove("theme-transition"), 260);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render both use the default; the real value is
  // synced after mount, so markup always matches during hydration.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readDocumentTheme());
    setMounted(true);

    // Keep multiple open tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        applyTheme(e.newValue, true);
        setThemeState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next, true);
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (private mode); theme still applies for this visit.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readDocumentTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = useMemo(
    () => ({ theme, mounted, setTheme, toggleTheme }),
    [theme, mounted, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
