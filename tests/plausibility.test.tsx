import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ageInYears, isOncePerDayItem, plausibilityText, plausibilityWarnings, sameDayEntries } from '../src/schema/plausibility';
import { HDSFormField } from '../src/components/HDSFormField';

/**
 * B-2026-11-05-6: the entry apps saved a systolic 50 / diastolic 70, a 12 kg adult and five weights on one day without
 * a word. Warnings only: the person may still save.
 */
describe('plausibilityWarnings', () => {
  it('flags a systolic not above its diastolic', () => {
    expect(plausibilityWarnings('body-blood-pressure', { systolic: 50, diastolic: 70 }, 'blood-pressure/mmhg-bpm'))
      .toEqual([{ code: 'systolicNotAboveDiastolic', systolic: 50, diastolic: 70 }]);
    expect(plausibilityWarnings('body-blood-pressure', { systolic: 120, diastolic: 80, rate: 70 }, 'blood-pressure/mmhg-bpm')).toEqual([]);
  });

  it('flags a blood-pressure part out of range, by part', () => {
    expect(plausibilityWarnings('body-blood-pressure', { systolic: 1200, diastolic: 80 }, undefined))
      .toEqual([{ code: 'range', value: 1200, min: 50, max: 300, part: 'systolic' }]);
  });

  it('checks a weight in the unit chosen, so a value in the wrong unit falls out', () => {
    expect(plausibilityWarnings('body-weight', 72, 'mass/kg')).toEqual([]);
    expect(plausibilityWarnings('body-weight', 400, 'mass/kg')).toHaveLength(1);
    expect(plausibilityWarnings('body-weight', 400, 'mass/lb')).toEqual([]);
    expect(plausibilityWarnings('body-height', 170, 'length/m')).toHaveLength(1);
    expect(plausibilityWarnings('body-temperature-basal', 98.6, 'temperature/c')).toHaveLength(1);
  });

  it('uses the adult range when the age is known', () => {
    expect(plausibilityWarnings('body-weight', 12, 'mass/kg')).toEqual([]);
    expect(plausibilityWarnings('body-weight', 12, 'mass/kg', { ageYears: 40 })).toEqual([{ code: 'range', value: 12, min: 30, max: 350 }]);
    expect(plausibilityWarnings('body-weight', 12, 'mass/kg', { ageYears: 2 })).toEqual([]);
  });

  it('says nothing without a rule, a unit or a number', () => {
    expect(plausibilityWarnings('body-weight', 400, undefined)).toEqual([]);
    expect(plausibilityWarnings('mood-valence', 99, 'ratio/generic')).toEqual([]);
    expect(plausibilityWarnings('body-weight', '', 'mass/kg')).toEqual([]);
    expect(plausibilityWarnings(undefined, 400, 'mass/kg')).toEqual([]);
  });
});

describe('plausibilityText', () => {
  it('names the part by its label', () => {
    const text = plausibilityText({ code: 'range', value: 1200, min: 50, max: 300, part: 'systolic' }, { systolic: 'Systolic' });
    expect(text).toMatch(/^Systolic: 1200 /);
    expect(text).toContain('50');
  });
});

describe('ageInYears', () => {
  it('counts whole years', () => {
    expect(ageInYears('1990-06-15', new Date(2026, 5, 14))).toBe(35);
    expect(ageInYears('1990-06-15', new Date(2026, 5, 15))).toBe(36);
    expect(ageInYears(null)).toBeUndefined();
    expect(ageInYears('not a date')).toBeUndefined();
  });
});

describe('same-day duplicates', () => {
  const at = (d: number, h: number) => new Date(2025, 4, d, h).getTime() / 1000;
  const entries = [
    { id: 'a', time: at(22, 8), type: 'mass/kg', content: 70 },
    { id: 'b', time: at(22, 9), type: 'mass/kg', content: 65 },
    { id: 'c', time: at(21, 9), type: 'mass/kg', content: 70 },
    { id: 'd', time: at(22, 10), type: 'mass/kg', content: 70, trashed: true }
  ];

  it('an item entered once a day: every entry of that day', () => {
    expect(sameDayEntries(entries, at(22, 20), { oncePerDay: true }).map(e => e.id)).toEqual(['a', 'b']);
    expect(sameDayEntries(entries, at(22, 20), { oncePerDay: true, excludeId: 'a' }).map(e => e.id)).toEqual(['b']);
  });

  it('another item: only the same value in the same unit', () => {
    expect(sameDayEntries(entries, at(22, 20), { oncePerDay: false, value: 70, eventType: 'mass/kg' }).map(e => e.id)).toEqual(['a']);
    expect(sameDayEntries(entries, at(22, 20), { oncePerDay: false, value: 70, eventType: 'mass/lb' })).toEqual([]);
    const bp = [{ id: 'x', time: at(22, 8), content: { systolic: 120, diastolic: 80 } }];
    expect(sameDayEntries(bp, at(22, 9), { oncePerDay: false, value: { systolic: 120, diastolic: 80, rate: null } })).toHaveLength(1);
    expect(sameDayEntries(bp, at(22, 9), { oncePerDay: false, value: { systolic: 121, diastolic: 80 } })).toHaveLength(0);
  });

  it('reads once a day from the item', () => {
    expect(isOncePerDayItem({ repeatable: 'P1D' })).toBe(true);
    expect(isOncePerDayItem({ repeatable: 'unlimited', reminder: { cooldown: 'P1D' } })).toBe(true);
    expect(isOncePerDayItem({ repeatable: 'unlimited' })).toBe(false);
    expect(isOncePerDayItem(undefined)).toBe(false);
  });
});

describe('HDSFormField plausibility note', () => {
  const weight: any = {
    type: 'number',
    label: { en: 'Body weight' },
    streamId: 'body-weight',
    variations: { eventType: { label: { en: 'Unit' }, options: [{ value: 'mass/kg', label: { en: 'kg' } }, { value: 'mass/lb', label: { en: 'Lbs' } }] } }
  };
  const bp: any = {
    type: 'composite',
    label: { en: 'Blood pressure' },
    eventType: 'blood-pressure/mmhg-bpm',
    composite: {
      systolic: { type: 'number', label: { en: 'Systolic' } },
      diastolic: { type: 'number', label: { en: 'Diastolic' } },
      rate: { type: 'number', label: { en: 'Pulse' }, canBeNull: true }
    }
  };
  const render = (props: any) => renderToStaticMarkup(<HDSFormField onChange={() => {}} {...props} />);

  it('warns under an implausible value, in the unit the host chose', () => {
    expect(render({ itemData: weight, itemKey: 'body-weight', value: 400, eventType: 'mass/kg' })).toContain('data-hds-plausibility');
    expect(render({ itemData: weight, itemKey: 'body-weight', value: 400, eventType: 'mass/lb' })).not.toContain('data-hds-plausibility');
  });

  it('warns once for a composite, not for its parts', () => {
    const html = render({ itemData: bp, itemKey: 'body-blood-pressure', value: { systolic: 50, diastolic: 70 } });
    expect(html.match(/data-hds-plausibility/g)).toHaveLength(1);
    expect(html).toContain('(50)');
  });

  it('is turned off with plausibility={false}', () => {
    expect(render({ itemData: weight, itemKey: 'body-weight', value: 400, eventType: 'mass/kg', plausibility: false })).not.toContain('data-hds-plausibility');
  });

  it('keeps the warning inside the pre-filled wrapper', () => {
    const html = render({ itemData: weight, itemKey: 'body-weight', value: 400, eventType: 'mass/kg', prefilled: true });
    expect(html).toMatch(/^<div data-hds-prefilled="true">.*data-hds-plausibility.*<\/div>$/s);
  });
});
