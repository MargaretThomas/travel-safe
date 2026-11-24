import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("travel-safe-theme", theme);
    } catch {
      // Storage can be disabled; the class still applies for this session.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((value) => (value === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
