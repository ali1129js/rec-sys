import { describe, expect, it } from 'vitest';
import { posterLetter, posterTone } from './poster';

describe('poster helpers', () => {
  it('skips a leading English article when choosing the letter', () => {
    expect(posterLetter('The Shawshank Redemption')).toBe('S');
    expect(posterLetter('A Clockwork Orange')).toBe('C');
    expect(posterLetter('Heat')).toBe('H');
  });

  it('returns a stable tone for the same title', () => {
    expect(posterTone('Heat')).toBe(posterTone('Heat'));
    expect(['cobalt', 'pewter', 'jade', 'garnet', 'saffron', 'lagoon']).toContain(posterTone('Heat'));
  });
});
