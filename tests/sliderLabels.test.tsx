import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HDSFormField } from '../src/components/HDSFormField';
import { mergeSliderLabels } from '../src/components/sliderLabels';

/**
 * A form overrides a slider's anchors (`ItemLabels.sliderLabels`, B-2026-11-12-1): the EQ-5D-5L preset shows
 * EuroQol's VAS anchors while the data-model item keeps generic ones.
 */
const item: any = {
  type: 'slider',
  label: { en: 'Self-rated health' },
  min: 0,
  max: 1,
  step: 0.01,
  slider: {
    display: { multiplier: 100, precision: 0 },
    labels: {
      0: { label: { en: 'Very poor' }, description: { en: 'Very poor health' } },
      1: { label: { en: 'Excellent' }, description: { en: 'Excellent health' } }
    }
  }
};

describe('[SLO] slider anchor overrides', () => {
  it('[SLO1] mergeSliderLabels: the override wins per anchor, the rest is kept', () => {
    const merged = mergeSliderLabels(item.slider.labels, { 0: { label: { en: 'The worst health you can imagine' } } });
    expect(merged?.[0]).toEqual({ label: { en: 'The worst health you can imagine' }, description: { en: 'Very poor health' } });
    expect(merged?.[1]).toEqual(item.slider.labels[1]);
    expect(mergeSliderLabels(item.slider.labels, undefined)).toBe(item.slider.labels);
  });

  it('[SLO2] an anchor the item lacks is added only with a label', () => {
    const merged = mergeSliderLabels(item.slider.labels, { 0.5: { label: { en: 'Middle' } }, 0.25: { description: { en: 'x' } } });
    expect(merged?.[0.5]).toEqual({ label: { en: 'Middle' } });
    expect(merged?.[0.25]).toBeUndefined();
  });

  const overrides = {
    question: { en: 'We would like to know how good or bad your health is TODAY.' },
    sliderLabels: {
      0: { label: { en: 'The worst health you can imagine' } },
      1: { label: { en: 'The best health you can imagine' } }
    }
  };

  it('[SLO3] HDSFormField renders a single form override\'s anchors', () => {
    const html = renderToStaticMarkup(<HDSFormField itemData={item} value={0.5} onChange={() => {}} labelOverrides={overrides} />);
    expect(html).toContain('The worst health you can imagine');
    expect(html).toContain('The best health you can imagine');
    expect(html).not.toContain('Very poor</div>');
  });

  it('[SLO4] and the anchors of each form when several ask the item', () => {
    const html = renderToStaticMarkup(
      <HDSFormField
        itemData={item}
        value={0.5}
        onChange={() => {}}
        labelOverrides={[
          { ...overrides, source: { contactName: 'Dr. A' } },
          { question: { en: 'Your health' }, source: { contactName: 'Dr. B' } }
        ]}
      />
    );
    expect(html).toContain('The best health you can imagine');
    expect(html).toContain('Excellent</div>');
  });
});
