import { describe, it, expect } from 'vitest';
import { jsonFormForItemDef } from '../src/schema/itemDefToSchema';
import type { ItemDef } from '../src/schema/itemDefToSchema';

function makeItemDef (data: Partial<ItemDef['data']>, template?: Record<string, unknown>): ItemDef {
  return {
    data: {
      type: 'text',
      label: { en: 'Test' },
      ...data
    } as any,
    eventTemplate: () => (template || { streamIds: ['s1'], type: 'note/txt' })
  };
}

describe('jsonFormForItemDef', () => {
  it('standard case: wraps content in object', () => {
    const itemDef = makeItemDef({ type: 'text', label: { en: 'Name' } });
    const result = jsonFormForItemDef(itemDef);
    const schema = result.schema as any;
    expect(schema.type).toBe('object');
    expect(schema.properties.content).toBeDefined();
    expect(schema.properties.content.type).toBe('string');
    expect(schema.required).toEqual(['content']);
  });

  it('eventDataForFormData merges with template', () => {
    const itemDef = makeItemDef(
      { type: 'number', label: { en: 'Temp' } },
      { streamIds: ['s1'], type: 'temperature/c' }
    );
    const result = jsonFormForItemDef(itemDef);
    const eventData = result.eventDataForFormData({ content: 37.5 });
    expect(eventData).toEqual({
      streamIds: ['s1'],
      type: 'temperature/c',
      content: 37.5
    });
  });

  describe('activity/plain checkbox', () => {
    it('returns schema directly (not wrapped)', () => {
      const itemDef = makeItemDef({
        type: 'checkbox',
        label: { en: 'Walk' },
        eventType: 'activity/plain'
      });
      const result = jsonFormForItemDef(itemDef);
      const schema = result.schema as any;
      expect(schema.type).toBe('boolean');
      expect(schema.properties).toBeUndefined();
    });

    it('processData filters false → null', () => {
      const itemDef = makeItemDef(
        { type: 'checkbox', label: { en: 'Walk' }, eventType: 'activity/plain' },
        { streamIds: ['s1'], type: 'activity/plain' }
      );
      const result = jsonFormForItemDef(itemDef);
      expect(result.eventDataForFormData(false as any)).toBeNull();
    });

    it('processData passes true → event created', () => {
      const itemDef = makeItemDef(
        { type: 'checkbox', label: { en: 'Walk' }, eventType: 'activity/plain' },
        { streamIds: ['s1'], type: 'activity/plain' }
      );
      const result = jsonFormForItemDef(itemDef);
      const eventData = result.eventDataForFormData(true as any);
      expect(eventData).not.toBeNull();
    });
  });

  describe('ratio/generic select', () => {
    // ratio/generic itemDefs have options both as array (for schemaFor/SelectData)
    // and as Record keys (for relativeTo computation via Object.keys)
    const selectOptions = [
      { value: 0, label: { en: '0' } },
      { value: 5, label: { en: '5' } },
      { value: 10, label: { en: '10' } }
    ];

    function makeRatioItemDef (template?: Record<string, unknown>) {
      const itemDef = makeItemDef(
        { type: 'select', label: { en: 'Pain' }, eventType: 'ratio/generic' },
        template
      );
      // schemaFor needs array format (SelectData.options)
      (itemDef.data as any).options = selectOptions;
      return itemDef;
    }

    it('wraps with nested content.value structure', () => {
      const result = jsonFormForItemDef(makeRatioItemDef());
      const schema = result.schema as any;
      expect(schema.properties.content.properties.value).toBeDefined();
    });

    it('processData injects relativeTo', () => {
      const result = jsonFormForItemDef(makeRatioItemDef({ streamIds: ['s1'], type: 'ratio/generic' }));
      const eventData = result.eventDataForFormData({ content: { value: 5 } }) as any;
      // With the fix, relativeTo is the max option value (10), not max array index
      expect(eventData.content.relativeTo).toBe(10);
    });

    it('returns null when content is null', () => {
      const result = jsonFormForItemDef(makeRatioItemDef({ streamIds: ['s1'], type: 'ratio/generic' }));
      const eventData = result.eventDataForFormData({ content: null } as any);
      expect(eventData).toBeNull();
    });
  });

  describe('variations', () => {
    it('adds type selector to schema', () => {
      const itemDef = makeItemDef({
        type: 'text',
        label: { en: 'Symptom' },
        variations: {
          eventType: {
            label: { en: 'Category' },
            options: [
              { value: 'mild', label: { en: 'Mild' } },
              { value: 'severe', label: { en: 'Severe' } }
            ]
          }
        }
      });
      const result = jsonFormForItemDef(itemDef);
      const schema = result.schema as any;
      expect(schema.properties.type).toBeDefined();
      expect(schema.properties.type.oneOf).toEqual([
        { const: 'mild', title: 'Mild' },
        { const: 'severe', title: 'Severe' }
      ]);
    });
  });
});
