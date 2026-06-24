"use client";
import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Handle Theme Init
  useEffect(() => {
    const storedTheme = document.documentElement
      .getAttribute("data-theme") as "light" | "dark" | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialTheme = systemPrefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", nextTheme);
      try {
        // Persist theme in a cookie so the server can read it during SSR and
        // render the same `data-theme` attribute, preventing hydration warnings.
        document.cookie = `theme=${encodeURIComponent(
          nextTheme
        )}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      } catch (e) {
        // ignore
      }
      return nextTheme;
    });
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
