import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HDSFormField } from '../src/components/HDSFormField';

/**
 * The unit next to a number with a unit choice follows the unit the host chose (its Unit select, or the
 * stored event's type), not the person's preference: editing a lb entry with a kg preference showed "kg"
 * next to the number while the select said lb (B-2026-10-28-39).
 */
const weight: any = {
  type: 'number',
  label: { en: 'Body weight' },
  streamId: 'body-weight',
  variations: {
    eventType: {
      label: { en: 'Unit' },
      options: [{ value: 'mass/kg', label: { en: 'kg' } }, { value: 'mass/lb', label: { en: 'Lbs' } }]
    }
  }
};

function render (eventType?: string): string {
  return renderToStaticMarkup(
    <HDSFormField itemData={weight} itemKey='body-weight' value={72} onChange={() => {}} eventType={eventType} />
  );
}

describe('HDSFormField number unit with variations', () => {
  it('shows the unit the host chose', () => {
    expect(render('mass/lb')).toContain('Lbs');
    expect(render('mass/lb')).not.toContain('>kg<');
  });

  it('falls back to the first option without a choice', () => {
    expect(render()).toContain('>kg<');
  });

  it('ignores a type that is not one of the options', () => {
    expect(render('length/m')).toContain('>kg<');
  });
});
