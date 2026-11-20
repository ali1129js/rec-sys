export const LAYOUTS = ['hero', 'sidebar', 'rows'] as const;
export type Layout = (typeof LAYOUTS)[number];

export const LAYOUT_LABELS: Record<Layout, string> = {
  hero: 'Hero grid',
  sidebar: 'Sidebar',
  rows: 'Genre rows',
};

const KEY = 'rec-sys-layout';

export const isLayout = (value: unknown): value is Layout => LAYOUTS.includes(value as Layout);

/** Default is the recommended proposal (hero search + poster grid). */
export function initialLayout(): Layout {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isLayout(stored)) return stored;
  } catch {
    /* storage blocked */
  }
  return 'hero';
}

export function persistLayout(layout: Layout): void {
  try {
    window.localStorage.setItem(KEY, layout);
  } catch {
    /* storage blocked */
  }
}
