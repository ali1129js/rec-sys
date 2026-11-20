export const THEMES = ['khaki', 'graphite', 'midnight'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  khaki: 'Khaki',
  graphite: 'Graphite',
  midnight: 'Midnight plum',
};

const KEY = 'rec-sys-theme';

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

function migrateTheme(value: string | null): Theme | null {
  if (value === 'light') return 'khaki';
  if (value === 'dark' || value === 'darkgrey') return 'graphite';
  if (value === 'contrast') return 'midnight';
  return isTheme(value) ? value : null;
}

export function initialTheme(): Theme {
  try {
    const stored = migrateTheme(window.localStorage.getItem(KEY));
    if (stored) return stored;
  } catch {
    /* storage blocked */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'graphite' : 'khaki';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'khaki' ? 'light' : 'dark';
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* storage blocked */
  }
}
