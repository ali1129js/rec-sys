import { afterEach, describe, expect, it } from 'vitest';
import { applyMotion, effectiveMotion, initialMotion, readStoredMotion } from './motion';

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.motion;
});

describe('motion preference', () => {
  it('defaults to static and writes the stored choice, not the reduced effective value', () => {
    expect(initialMotion()).toBe('static');
    applyMotion('animated', true);
    expect(document.documentElement.dataset.motion).toBe('static');
    expect(readStoredMotion()).toBe('animated');
    expect(effectiveMotion('animated', true)).toBe('static');
    expect(effectiveMotion('animated', false)).toBe('animated');
  });
});
