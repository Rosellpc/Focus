export type Theme = "dark" | "light";
export function initializeTheme(): Theme {
  let theme: Theme = "dark";
  try {
    if (localStorage.getItem("focus-theme") === "light") theme = "light";
  } catch {
    /* The selected theme still works for this session. */
  }
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("focus-theme", theme);
  } catch {
    /* Keep the session theme. */
  }
}
