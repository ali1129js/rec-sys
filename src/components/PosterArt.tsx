import { posterLetter, posterTone } from '../lib/poster';

export function PosterArt({ title, year }: { title: string; year: number }) {
  return (
    <div className="poster-art" data-tone={posterTone(title)} aria-hidden="true">
      <span className="poster-letter">{posterLetter(title)}</span>
      <span className="poster-year">{year}</span>
    </div>
  );
}
