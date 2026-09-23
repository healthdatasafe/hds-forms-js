import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Select } from '../src/components/fields/Select';
import { NumberInput } from '../src/components/fields/NumberInput';

/**
 * A `select` item may sit on a CONTINUOUS eventType, where the options are the
 * human-entry surface and a device bridge writes values in between. `fertility-test-opk`
 * is on `test-result/scale` (-1..1) with three options, and hds-webapp's HealthKit bridge
 * maps an "estrogen surge" to 0.5 (`OVULATION_TO_SCALE[4]`).
 *
 * A controlled <select> whose value matches no option renders BLANK, and under native form
 * validation a `required` field then forces the user to overwrite a real reading just to
 * submit. `HDSFormField` appends an option for such a value so it survives being rendered;
 * these tests pin the rendering contract `Select` has to honour for that to work.
 */
const RESULT_OPTIONS = [
  { value: -1, label: 'Negative' },
  { value: 0, label: 'Indeterminate' },
  { value: 1, label: 'Positive' }
];

const base = { label: 'Ovulation test', onChange: () => {}, required: false, disabled: false };

describe('Select — a stored value that matches no option', () => {
  it('renders blank when the value has no matching option', () => {
    // The failure this guards against. Note `selected` appears nowhere.
    const html = renderToStaticMarkup(<Select {...base} value={0.5} options={RESULT_OPTIONS} />);
    expect(html).not.toContain('selected');
  });

  it('selects the value once a read-back option carries it', () => {
    const withReadBack = [...RESULT_OPTIONS, { value: 0.5, label: '0.5' }];
    const html = renderToStaticMarkup(<Select {...base} value={0.5} options={withReadBack} />);
    expect(html).toContain('value="0.5" selected');
  });

  it('still selects a value that does match an option', () => {
    const html = renderToStaticMarkup(<Select {...base} value={1} options={RESULT_OPTIONS} />);
    expect(html).toContain('value="1" selected');
  });

  it('selects the -1 option rather than treating it as absent', () => {
    // -1 is "negative", a real answer, and the value most likely to trip a falsy check.
    const html = renderToStaticMarkup(<Select {...base} value={-1} options={RESULT_OPTIONS} />);
    expect(html).toContain('value="-1" selected');
  });

  it('selects the 0 option rather than treating it as absent', () => {
    const html = renderToStaticMarkup(<Select {...base} value={0} options={RESULT_OPTIONS} />);
    expect(html).toContain('value="0" selected');
  });
});

describe('NumberInput — step', () => {
  it('emits step="any" when the item declares none', () => {
    // Without a step attribute the browser defaults to 1, so 72.5 kg would be a stepMismatch
    // and block submission under native form validation.
    const html = renderToStaticMarkup(
      <NumberInput label='Weight' value={72.5} onChange={() => {}} required={false} disabled={false} />
    );
    expect(html).toContain('step="any"');
  });

  it('emits a declared step, scaled into the display scale', () => {
    const html = renderToStaticMarkup(
      <NumberInput
        label='Hematocrit'
        value={0.42}
        onChange={() => {}}
        required={false}
        disabled={false}
        step={0.01}
        min={0}
        max={1}
        display={{ multiplier: 100 }}
      />
    );
    expect(html).toContain('step="1"');
    expect(html).toContain('min="0"');
    // The raw bound is 1; the input is display-scaled, so the DOM needs 100.
    expect(html).toContain('max="100"');
  });

  it('omits min and max entirely when the item declares none', () => {
    const html = renderToStaticMarkup(
      <NumberInput label='Free' value={1} onChange={() => {}} required={false} disabled={false} />
    );
    expect(html).not.toContain('min=');
    expect(html).not.toContain('max=');
  });
});
