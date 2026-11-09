"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/features/theme/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Accessible Dark/Light switch. Shows a Moon in Dark Mode and a Sun in Light Mode.
 * Before mount it renders a fixed-size placeholder icon state identical on server
 * and client, so there is no hydration mismatch and no layout shift.
 */
export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = !mounted || theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={!isDark}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center border border-white/20 text-white/80 transition hover:border-white hover:text-white ${className}`}
    >
      {isDark ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
