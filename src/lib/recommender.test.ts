import { describe, expect, it } from 'vitest';
import { fixture } from '../test/fixtures';
import { genreBit } from './genres';
import {
  diceMask,
  eraCloseness,
  jaccardMask,
  NO_FILTERS,
  passesFilters,
  recommend,
  recommendCollaborative,
  recommendContent,
  sortRecommendations,
  type RecommendOptions,
} from './recommender';

const opts = (over: Partial<RecommendOptions> = {}): RecommendOptions => ({
  mode: 'popular',
  filters: NO_FILTERS,
  limit: 10,
  sort: 'relevance',
  ...over,
});

const titles = (recs: { movie: { title: string } }[]) => recs.map((r) => r.movie.title);

describe('recommendCollaborative', () => {
  const cat = fixture();

  it('returns neighbours of the pick, best first, never the pick itself', () => {
    const recs = recommendCollaborative(cat, [2], opts());
    expect(titles(recs)).toEqual(['Se7en', 'Obscure Gem', 'The Matrix']);
    expect(recs.map((r) => r.movie.index)).not.toContain(2);
  });

  it('Toy Story recommends Toy Story 2', () => {
    expect(titles(recommendCollaborative(cat, [0], opts()))).toEqual(['Toy Story 2']);
  });

  it('sums similarity across several picks so shared neighbours rise', () => {
    // Heat -> Se7en .4, Gem .35; Se7en -> Heat .4, Gem .15. Gem = .5 total, Heat is a pick.
    const recs = recommendCollaborative(cat, [2, 3], opts());
    expect(titles(recs)[0]).toBe('Obscure Gem');
    expect(recs[0]?.score).toBeCloseTo(0.5, 5);
    expect(recs[0]?.reasons.map((r) => r.seed).sort()).toEqual([2, 3]);
  });

  it('excludes every picked film', () => {
    const recs = recommendCollaborative(cat, [2, 3], opts());
    expect(titles(recs)).not.toContain('Heat');
    expect(titles(recs)).not.toContain('Se7en');
  });

  it('is empty without picks or for a pick with no neighbour list', () => {
    expect(recommendCollaborative(cat, [], opts())).toEqual([]);
    expect(recommendCollaborative(cat, [6], opts())).toEqual([]);
  });

  it('does not mutate its inputs', () => {
    const picks = Object.freeze([2, 3]) as readonly number[];
    const before = JSON.stringify(cat.neighbours);
    recommendCollaborative(cat, picks, opts());
    expect(JSON.stringify(cat.neighbours)).toBe(before);
    expect(picks).toEqual([2, 3]);
  });

  it('applies genre filters with OR semantics', () => {
    const recs = recommendCollaborative(cat, [2], opts({ filters: { genreMask: genreBit('Sci-Fi') | genreBit('Mystery'), decade: null } }));
    expect(titles(recs).sort()).toEqual(['Se7en', 'The Matrix']);
  });

  it('applies decade filters', () => {
    expect(titles(recommendCollaborative(cat, [2], opts({ filters: { genreMask: 0, decade: 2000 } })))).toEqual(['Obscure Gem']);
  });

  it('hidden-gems mode lifts a rarely-watched film above a blockbuster of equal similarity', () => {
    const popular = recommendCollaborative(cat, [2], opts());
    const gems = recommendCollaborative(cat, [2], opts({ mode: 'gems' }));
    const rank = (list: typeof popular, t: string) => titles(list).indexOf(t);
    expect(rank(gems, 'Obscure Gem')).toBeLessThanOrEqual(rank(popular, 'Obscure Gem'));
    expect(rank(gems, 'Obscure Gem')).toBe(0);
  });

  it('falls back to second-order neighbours when filters leave too few matches', () => {
    // Toy Story's only neighbour is Toy Story 2; its neighbour is Toy Story (a pick, excluded). With a
    // Crime filter nothing qualifies, so the result is empty rather than invented.
    const crime = { genreMask: genreBit('Crime'), decade: null };
    expect(recommendCollaborative(cat, [0], opts({ filters: crime }))).toEqual([]);
    // Matrix's neighbour Heat leads on to Se7en and Gem at half weight.
    const second = recommendCollaborative(cat, [4], opts({ limit: 5, filters: { genreMask: genreBit('Mystery'), decade: null } }));
    expect(titles(second)).toEqual(['Se7en']);
  });

  it('respects the limit', () => {
    expect(recommendCollaborative(cat, [2], opts({ limit: 1 }))).toHaveLength(1);
  });
});

describe('sorting', () => {
  const cat = fixture();
  const recs = recommendCollaborative(cat, [2], opts());
  it('sorts by IMDb rating, year, and relevance', () => {
    expect(titles(sortRecommendations(recs, 'imdb'))[0]).toBe('The Matrix');
    expect(titles(sortRecommendations(recs, 'newest'))[0]).toBe('Obscure Gem');
    expect(titles(sortRecommendations(recs, 'oldest'))[0]).toBe('Se7en');
    expect(titles(sortRecommendations(recs, 'relevance'))[0]).toBe('Se7en');
  });
  it('does not mutate the list it sorts', () => {
    const copy = [...recs];
    sortRecommendations(recs, 'newest');
    expect(recs).toEqual(copy);
  });
});

describe('content layer', () => {
  const cat = fixture();

  it('is empty until the content layer is loaded', () => {
    expect(recommendContent(fixture(false), [2], opts())).toEqual([]);
  });

  it('matches by shared director/cast and genres, and explains what was shared', () => {
    const recs = recommendContent(cat, [2], opts());
    const ronin = recs.find((r) => r.movie.title === 'Ronin');
    expect(ronin).toBeDefined();
    expect(ronin?.kind).toBe('content');
    expect(ronin?.reasons[0]?.shared?.join(' ')).toContain('Robert De Niro');
  });

  it('requires a shared genre and never recommends the pick', () => {
    const recs = recommendContent(cat, [6], opts());
    expect(titles(recs)).not.toContain('Metropolis');
    expect(recs.every((r) => (r.movie.genreMask & cat.movies[6]!.genreMask) !== 0)).toBe(true);
  });

  it('can recommend across eras: a 1927 pick finds modern Sci-Fi', () => {
    expect(titles(recommendContent(cat, [6], opts({ filters: { genreMask: genreBit('Sci-Fi'), decade: null } })))).toContain('The Matrix');
  });

  it('recommend() keeps the two lists disjoint', () => {
    const { collaborative, content } = recommend(cat, [2], opts());
    const a = new Set(collaborative.map((r) => r.movie.index));
    expect(content.every((r) => !a.has(r.movie.index))).toBe(true);
  });
});

describe('helpers', () => {
  it('diceMask', () => {
    expect(diceMask(0b0110, 0b0011)).toBeCloseTo(0.5, 10);
    expect(diceMask(0, 0)).toBe(0);
  });
  it('jaccardMask', () => {
    expect(jaccardMask(0b0110, 0b0011)).toBeCloseTo(1 / 3, 10);
    expect(jaccardMask(0, 0)).toBe(0);
  });
  it('eraCloseness fades with distance', () => {
    expect(eraCloseness(1990, 1995)).toBe(1);
    expect(eraCloseness(1990, 2030)).toBe(0);
    expect(eraCloseness(1990, 2012)).toBeGreaterThan(0);
  });
  it('passesFilters', () => {
    const toy = fixture().movies[0]!;
    expect(passesFilters(toy, NO_FILTERS)).toBe(true);
    expect(passesFilters(toy, { genreMask: genreBit('Horror'), decade: null })).toBe(false);
    expect(passesFilters(toy, { genreMask: 0, decade: 1990 })).toBe(true);
    expect(passesFilters(toy, { genreMask: 0, decade: 1980 })).toBe(false);
  });
});
