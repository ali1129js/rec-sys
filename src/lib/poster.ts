const TONES = ['cobalt', 'pewter', 'jade', 'garnet', 'saffron', 'lagoon'] as const;
export type PosterTone = (typeof TONES)[number];

const ARTICLES = /^(the|a|an)\s+/i;

/** Stable accent for typographic poster art, derived from the title. */
export function posterTone(title: string): PosterTone {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length] as PosterTone;
}

/** First letter used on the poster, skipping a leading English article. */
export function posterLetter(title: string): string {
  const core = title.replace(ARTICLES, '').trim();
  const ch = [...core].find((c) => /\p{L}/u.test(c)) ?? [...title].find((c) => /\p{L}/u.test(c));
  return (ch ?? '?').toUpperCase();
}
