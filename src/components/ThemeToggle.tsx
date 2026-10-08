import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { applyTheme, type Theme } from "../services/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const light = theme === "light";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Modo White"
      aria-pressed={light}
      title={light ? "Cambiar a modo Beige" : "Cambiar a modo White"}
      onClick={() => {
        const next = light ? "dark" : "light";
        applyTheme(next);
        setTheme(next);
      }}
    >
      {light ? (
        <Sun size={16} strokeWidth={1.7} />
      ) : (
        <Moon size={16} strokeWidth={1.7} />
      )}
      <span>{light ? "White" : "Beige"}</span>
    </button>
  );
}
