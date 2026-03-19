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

  it('throws for unknown type', () => {
    const data = { type: 'unknown', label: { en: 'Bad' } } as any;
    expect(() => schemaFor(data)).toThrow('Cannot find schema for type: "unknown"');
  });
});
