import { describe, it, expect } from 'vitest';
import { schemaFor } from '../src/schema/schemas';
import type { ItemData } from '../src/schema/schemas';

describe('schemaFor', () => {
  it('checkbox → boolean', () => {
    const data: ItemData = { type: 'checkbox', label: { en: 'Active' } };
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Active',
      type: 'boolean'
    });
  });

  it('date → string with format', () => {
    const data: ItemData = { type: 'date', label: { en: 'Birth date' } };
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Birth date',
      type: 'string',
      format: 'date',
      dateSaveFormat: 'YYYY-MM-DD'
    });
  });

  it('text → string with minLength when required', () => {
    const data: ItemData = { type: 'text', label: { en: 'Name' } };
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Name',
      type: 'string',
      minLength: 1
    });
  });

  it('text with canBeNull → no minLength', () => {
    const data: ItemData = { type: 'text', label: { en: 'Notes' }, canBeNull: true };
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Notes',
      type: 'string'
    });
  });

  it('number → number', () => {
    const data: ItemData = { type: 'number', label: { en: 'Weight' } };
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Weight',
      type: 'number'
    });
  });

  // B-2026-09-23-2: data-model publishes min/max/step as item-level properties on the
  // `type: number` and `type: slider` branches, and this builder used to drop them — so a
  // bound the model stated was advisory and an out-of-range value validated. The driving
  // case is `lifestyle-alcohol-typical-quantity` (grams of ethanol, `min: 0`), where a
  // negative passed both the item schema and the eventType schema.
  it('number → carries min/max/step through as minimum/maximum/multipleOf', () => {
    const data: ItemData = { type: 'number', label: { en: 'Ethanol' }, min: 0, max: 500, step: 0.5 } as ItemData;
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Ethanol',
      type: 'number',
      minimum: 0,
      maximum: 500,
      multipleOf: 0.5
    });
  });

  it('number → omits bounds that are not declared', () => {
    const data: ItemData = { type: 'number', label: { en: 'Weight' }, min: 0 } as ItemData;
    const schema = schemaFor(data);
    expect(schema.minimum).toBe(0);
    expect(schema.maximum).toBeUndefined();
    expect(schema.multipleOf).toBeUndefined();
  });

  it('number → min: 0 survives, rather than being dropped as falsy', () => {
    // The bound that matters most is exactly the one a truthiness check would lose.
    const data: ItemData = { type: 'number', label: { en: 'Ethanol' }, min: 0 } as ItemData;
    expect(schemaFor(data).minimum).toBe(0);
  });

  it('number → a zero step is not emitted, since multipleOf: 0 matches nothing', () => {
    const data: ItemData = { type: 'number', label: { en: 'X' }, step: 0 } as ItemData;
    expect(schemaFor(data).multipleOf).toBeUndefined();
  });

  it('slider → carries its mandatory bounds through', () => {
    const data: ItemData = { type: 'slider', label: { en: 'Health' }, min: 0, max: 1, step: 0.01 } as ItemData;
    const schema = schemaFor(data);
    expect(schema.type).toBe('number');
    expect(schema.minimum).toBe(0);
    expect(schema.maximum).toBe(1);
    expect(schema.multipleOf).toBe(0.01);
  });

  it('select with string options → string + oneOf', () => {
    const data: ItemData = {
      type: 'select',
      label: { en: 'Color' },
      options: [
        { value: 'red', label: { en: 'Red' } },
        { value: 'blue', label: { en: 'Blue' } }
      ]
    };
    const schema = schemaFor(data);
    expect(schema.type).toBe('string');
    expect(schema.oneOf).toEqual([
      { const: 'red', title: 'Red' },
      { const: 'blue', title: 'Blue' }
    ]);
  });

  it('multi-select → array of enum values, uniqueItems (site-agents#9/#10)', () => {
    const data: ItemData = {
      type: 'multi-select',
      label: { en: 'Ethnicity' },
      options: [
        { value: 'white', label: { en: 'White' } },
        { value: 'asian', label: { en: 'Asian' } }
      ]
    };
    const schema = schemaFor(data);
    expect(schema.type).toBe('array');
    expect(schema.uniqueItems).toBe(true);
    expect(schema.items).toEqual({
      title: '',
      type: 'string',
      oneOf: [
        { const: 'white', title: 'White' },
        { const: 'asian', title: 'Asian' }
      ]
    });
    // The chosen values live in `items.oneOf`, not at the root — a consumer reading
    // schema.oneOf for a multi-select would silently get nothing.
    expect(schema.oneOf).toBeUndefined();
  });

  it('select with numeric options → number + oneOf', () => {
    const data: ItemData = {
      type: 'select',
      label: { en: 'Rating' },
      options: [
        { value: 1, label: { en: 'Low' } },
        { value: 5, label: { en: 'High' } }
      ]
    };
    const schema = schemaFor(data);
    expect(schema.type).toBe('number');
    expect(schema.oneOf).toEqual([
      { const: 1, title: 'Low' },
      { const: 5, title: 'High' }
    ]);
  });

  it('composite → object with properties and required', () => {
    const data: ItemData = {
      type: 'composite',
      label: { en: 'Blood pressure' },
      composite: {
        systolic: { type: 'number', label: { en: 'Systolic' } },
        diastolic: { type: 'number', label: { en: 'Diastolic' }, canBeNull: true }
      }
    };
    const schema = schemaFor(data);
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties!.systolic).toEqual({ title: 'Systolic', type: 'number' });
    expect(schema.properties!.diastolic).toEqual({ title: 'Diastolic', type: 'number' });
    expect(schema.required).toEqual(['systolic']);
  });

  it('includes description when provided', () => {
    const data: ItemData = {
      type: 'text',
      label: { en: 'Name' },
      description: { en: 'Your full name' }
    };
    const schema = schemaFor(data);
    expect(schema.description).toBe('Your full name');
  });

  it('datasource-search → object', () => {
    const data = { type: 'datasource-search', label: { en: 'Medication' }, datasource: 'medication' } as any;
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Medication',
      type: 'object'
    });
  });

  it('convertible → object', () => {
    const data: ItemData = {
      type: 'convertible',
      label: { en: 'Cervical Fluid' },
      'converter-engine': { key: 'euclidian-distance', version: 'v0', models: 'cervical-fluid' }
    };
    const schema = schemaFor(data);
    expect(schema).toEqual({
      title: 'Cervical Fluid',
      type: 'object'
    });
  });

  it('slider → number (storage is raw; display is UI-only)', () => {
    const data: ItemData = {
      type: 'slider',
      label: { en: 'Self-rated health' },
      min: 0,
      max: 1,
      step: 0.01,
      slider: {
        display: { multiplier: 100, precision: 0 },
        labels: {
          0: { label: { en: 'Worst' } },
          1: { label: { en: 'Best' } }
        }
      }
    };
    const schema = schemaFor(data);
    // The slider's UI configuration stays out of the schema — display, orientation and tick
    // labels are presentation. Its BOUNDS do not: they constrain the stored value, and until
    // 0.19.0 this assertion pinned them as absent, which is the bug it now guards against.
    expect(schema).toEqual({
      title: 'Self-rated health',
      type: 'number',
      minimum: 0,
      maximum: 1,
      multipleOf: 0.01
    });
  });

  it('throws for unknown type', () => {
    const data = { type: 'unknown', label: { en: 'Bad' } } as any;
    expect(() => schemaFor(data)).toThrow('Cannot find schema for type: "unknown"');
  });
});
