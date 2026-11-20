export const MOTIONS = ['static', 'animated'] as const;
export type Motion = (typeof MOTIONS)[number];

const KEY = 'rec-sys-motion';

export const isMotion = (value: unknown): value is Motion => MOTIONS.includes(value as Motion);

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export function readStoredMotion(): Motion {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === 'animated' ? 'animated' : 'static';
  } catch {
    return 'static';
  }
}

export function initialMotion(): Motion {
  return readStoredMotion();
}

export function effectiveMotion(stored: Motion, reduced: boolean = prefersReducedMotion()): Motion {
  return reduced ? 'static' : stored;
}

export function applyMotion(motion: Motion, reduced: boolean = prefersReducedMotion()): void {
  document.documentElement.dataset.motion = effectiveMotion(motion, reduced);
  try {
    window.localStorage.setItem(KEY, motion);
  } catch {
    /* storage blocked */
  }
}
