import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Recommendation } from '../lib/recommender';
import { fixture } from '../test/fixtures';
import { ResultList } from './ResultList';

const catalog = fixture();
const toyStory2 = catalog.movies[1];
if (!toyStory2) throw new Error('fixture missing Toy Story 2');

const rec: Recommendation = {
  movie: toyStory2,
  score: 1,
  kind: 'collaborative',
  reasons: [{ seed: 0, strength: 0.6 }],
};

describe('ResultList pick button', () => {
  it('adds a film from the card button, including with the keyboard', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onUnpick = vi.fn();
    render(
      <ResultList catalog={catalog} recs={[rec]} picked={new Set()} onPick={onPick} onUnpick={onUnpick} />,
    );
    const button = screen.getByRole('button', { name: 'Add Toy Story 2 to my picks' });
    expect(button).toHaveTextContent('Add to my picks');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveClass('pick-toggle');
    button.focus();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith(toyStory2.index);
    expect(onUnpick).not.toHaveBeenCalled();
  });

  it('shows an Added state for a film that is already a pick, and removes it on click', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onUnpick = vi.fn();
    render(
      <ResultList
        catalog={catalog}
        recs={[rec]}
        picked={new Set([toyStory2.index])}
        onPick={onPick}
        onUnpick={onUnpick}
      />,
    );
    const card = screen.getByRole('heading', { name: /Toy Story 2/ }).closest('li');
    expect(card).not.toBeNull();
    const button = within(card as HTMLElement).getByRole('button', { name: 'Add Toy Story 2 to my picks' });
    expect(button).toHaveTextContent('Added');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(onUnpick).toHaveBeenCalledWith(toyStory2.index);
    expect(onPick).not.toHaveBeenCalled();
  });
});
