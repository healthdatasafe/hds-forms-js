import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { decimalsOf, numberInputStep } from '../src/schema/valueDisplay';
import { NumberInput } from '../src/components/fields/NumberInput';
import { HDSFormField } from '../src/components/HDSFormField';

/**
 * The step of a number field follows the decimals the value is written with (36.52 → 0.01),
 * so the arrows move the digits that change from one day to the next, and a typed value is
 * never a stepMismatch. Nothing declared and nothing typed keeps `step="any"`.
 */
describe('decimalsOf', () => {
  it('counts the decimals written', () => {
    expect(decimalsOf('36.52')).toBe(2);
    expect(decimalsOf('36.5')).toBe(1);
    expect(decimalsOf('36')).toBe(0);
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf('')).toBe(0);
    expect(decimalsOf(undefined)).toBe(0);
    expect(decimalsOf('1e-7')).toBe(0);
  });
});

describe('numberInputStep', () => {
  it('keeps any when nothing is declared and no decimals are typed', () => {
    expect(numberInputStep({ text: '' })).toBe('any');
    expect(numberInputStep({ text: '72' })).toBe('any');
  });

  it('steps by the decimals typed', () => {
    expect(numberInputStep({ text: '36.52' })).toBe('0.01');
    expect(numberInputStep({ text: '72.5' })).toBe('0.1');
  });

  it('steps by the declared precision, at least', () => {
    expect(numberInputStep({ precision: 2, text: '36.5' })).toBe('0.01');
    expect(numberInputStep({ precision: 2, text: '' })).toBe('0.01');
    expect(numberInputStep({ precision: 1, text: '' })).toBe('0.1');
    expect(numberInputStep({ precision: 0, text: '' })).toBe(1);
  });

  it('never steps coarser than what is typed, even with a declared precision', () => {
    // A typed value must never be a stepMismatch.
    expect(numberInputStep({ precision: 1, text: '36.527' })).toBe('0.001');
    expect(numberInputStep({ precision: 0, text: '5.5' })).toBe('0.1');
  });

  it('counts the decimals of min, which is the step base', () => {
    expect(numberInputStep({ text: '1.5', displayMin: 0.25 })).toBe('0.01');
  });

  it('lets a step declared by the item win, in the display scale', () => {
    expect(numberInputStep({ step: 0.01, display: { multiplier: 100 }, text: '42.5', precision: 3 })).toBe(1);
    expect(numberInputStep({ step: 0.5, text: '36.52' })).toBe(0.5);
  });

  it('treats a zero or negative declared step as no step', () => {
    // step="0" is invalid HTML: the browser would fall back to 1.
    expect(numberInputStep({ step: 0, text: '' })).toBe('any');
    expect(numberInputStep({ step: -1, text: '36.52' })).toBe('0.01');
  });

  it('caps derived decimals', () => {
    expect(numberInputStep({ text: '0.30000000000000004' })).toBe('0.0000000001');
  });
});

const base = { onChange: () => {}, required: false, disabled: false };

describe('NumberInput — step from value and precision', () => {
  it('steps a prefilled 36.52 by 0.01', () => {
    const html = renderToStaticMarkup(<NumberInput {...base} label='Temperature' value={36.52} />);
    expect(html).toContain('step="0.01"');
  });

  it('honours a precision prop', () => {
    const html = renderToStaticMarkup(<NumberInput {...base} label='Temperature' value={36.5} precision={2} />);
    expect(html).toContain('step="0.01"');
  });

  it('honours display.precision when no precision prop is set', () => {
    const html = renderToStaticMarkup(<NumberInput {...base} label='Score' value={null} display={{ precision: 1 }} />);
    expect(html).toContain('step="0.1"');
  });
});

describe('NumberInput — label', () => {
  it('ties the label to the input (B-2026-10-27-11)', () => {
    const html = renderToStaticMarkup(<NumberInput {...base} label='Weight' value={72} description='Morning, fasting' />);
    const forId = html.match(/<label for="([^"]+)"/)?.[1];
    expect(forId).toBeTruthy();
    expect(html).toContain(`<input id="${forId}"`);
    const descId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descId).toBeTruthy();
    expect(html).toContain(`<p id="${descId}"`);
  });

  it('omits aria-describedby without a description', () => {
    const html = renderToStaticMarkup(<NumberInput {...base} label='Weight' value={72} />);
    expect(html).not.toContain('aria-describedby');
  });
});

describe('HDSFormField — number precision', () => {
  const tempItem: any = { type: 'number', label: { en: 'Basal temperature' } };

  it('passes the host precision to the input when the item declares no step', () => {
    const html = renderToStaticMarkup(<HDSFormField itemData={tempItem} value={36.5} onChange={() => {}} precision={2} />);
    expect(html).toContain('step="0.01"');
  });

  it("uses the item's number.display.precision by default", () => {
    const item = { ...tempItem, number: { display: { precision: 2 } } };
    const html = renderToStaticMarkup(<HDSFormField itemData={item} value={36.5} onChange={() => {}} />);
    expect(html).toContain('step="0.01"');
  });

  it("lets the item's own step win over the host precision", () => {
    const item = { ...tempItem, step: 0.5 };
    const html = renderToStaticMarkup(<HDSFormField itemData={item} value={36.5} onChange={() => {}} precision={2} />);
    expect(html).toContain('step="0.5"');
  });

  it('keeps step="any" when nothing is declared or typed', () => {
    const html = renderToStaticMarkup(<HDSFormField itemData={tempItem} value={36} onChange={() => {}} />);
    expect(html).toContain('step="any"');
  });
});
