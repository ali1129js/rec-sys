import { LAYOUTS, LAYOUT_LABELS, type Layout } from '../lib/layout';

export function LayoutSwitcher({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  return (
    <fieldset className="layouts">
      <legend>Layout</legend>
      <p className="proposal-note">Proposal switcher, not published</p>
      <div className="segmented">
        {LAYOUTS.map((l) => (
          <label key={l} className={layout === l ? 'seg on' : 'seg'}>
            <input type="radio" name="layout" value={l} checked={layout === l} onChange={() => onChange(l)} />
            <span>{LAYOUT_LABELS[l]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
